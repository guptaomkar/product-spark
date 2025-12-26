import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AttributeDefinition, EnrichmentStats, FileValidationResult, Product } from '@/types/enrichment';
import type { Json } from '@/integrations/supabase/types';
import { exportToExcel } from '@/lib/fileParser';

interface EnrichmentJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  products: Product[];
  attributes: AttributeDefinition[];
  currentIndex: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  results: Record<string, { status: string; data?: Record<string, string>; error?: string }>;
  createdAt: string;
}

export function useEnrichmentJob() {
  const { user } = useAuth();
  const [currentJob, setCurrentJob] = useState<EnrichmentJob | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Compute stats from job
  const stats: EnrichmentStats = currentJob ? {
    total: currentJob.totalCount,
    pending: currentJob.totalCount - currentJob.currentIndex,
    processing: currentJob.status === 'processing' ? Math.min(5, currentJob.totalCount - currentJob.currentIndex) : 0,
    success: currentJob.successCount,
    partial: 0,
    failed: currentJob.failedCount,
  } : {
    total: products.length,
    pending: products.length,
    processing: 0,
    success: 0,
    partial: 0,
    failed: 0,
  };

  const isEnriching = currentJob?.status === 'processing' || currentJob?.status === 'pending';
  const isComplete = currentJob?.status === 'completed';

  // Load any active job on mount
  useEffect(() => {
    if (!user) return;

    const loadActiveJob = async () => {
      const { data, error } = await supabase
        .from('enrichment_jobs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const productsData = data.products as unknown as Product[];
        const attributesData = data.attributes as unknown as AttributeDefinition[];
        setCurrentJob({
          id: data.id,
          status: data.status as EnrichmentJob['status'],
          products: productsData,
          attributes: attributesData,
          currentIndex: data.current_index,
          totalCount: data.total_count,
          successCount: data.success_count,
          failedCount: data.failed_count,
          results: data.results as unknown as EnrichmentJob['results'],
          createdAt: data.created_at,
        });
        setProducts(productsData);
        setAttributes(attributesData);
      }
    };

    loadActiveJob();
  }, [user]);

  // Subscribe to job updates for real-time progress
  useEffect(() => {
    if (!currentJob?.id) return;

    const channel = supabase
      .channel(`job-${currentJob.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'enrichment_jobs',
          filter: `id=eq.${currentJob.id}`,
        },
        (payload) => {
          const data = payload.new as any;
          setCurrentJob(prev => prev ? {
            ...prev,
            status: data.status,
            currentIndex: data.current_index,
            successCount: data.success_count,
            failedCount: data.failed_count,
            results: data.results,
          } : null);

          if (data.status === 'completed') {
            toast.success('Enrichment completed!');
          } else if (data.status === 'failed') {
            toast.error('Enrichment failed: ' + (data.error || 'Unknown error'));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentJob?.id]);

  const loadData = useCallback((result: FileValidationResult) => {
    setProducts(result.products);
    setAttributes(result.attributes);
    setCurrentJob(null);
  }, []);

  const startEnrichment = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to start enrichment');
      return;
    }
    
    if (products.length === 0) {
      toast.error('Please upload data first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[useEnrichmentJob] Starting enrichment with', products.length, 'products');
      
      // Create job in database
      const { data: job, error: jobError } = await supabase
        .from('enrichment_jobs')
        .insert({
          user_id: user.id,
          status: 'pending',
          products: JSON.parse(JSON.stringify(products)) as Json,
          attributes: JSON.parse(JSON.stringify(attributes)) as Json,
          total_count: products.length,
          current_index: 0,
          success_count: 0,
          failed_count: 0,
          results: {},
        })
        .select()
        .single();

      if (jobError) {
        console.error('[useEnrichmentJob] Failed to create job:', jobError);
        throw new Error(jobError.message || 'Failed to create job');
      }
      
      if (!job) {
        throw new Error('Failed to create job - no data returned');
      }

      console.log('[useEnrichmentJob] Job created:', job.id);

      setCurrentJob({
        id: job.id,
        status: 'pending',
        products: products,
        attributes: attributes,
        currentIndex: 0,
        totalCount: products.length,
        successCount: 0,
        failedCount: 0,
        results: {},
        createdAt: job.created_at,
      });

      // Trigger background processing
      console.log('[useEnrichmentJob] Invoking enrich-batch edge function');
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('enrich-batch', {
        body: { jobId: job.id, concurrency: 5 },
      });

      if (invokeError) {
        console.error('[useEnrichmentJob] Error invoking enrich-batch:', invokeError);
        toast.error('Error starting background processing: ' + invokeError.message);
        // Mark job as failed
        await supabase
          .from('enrichment_jobs')
          .update({ status: 'failed', error: 'Failed to start processing: ' + invokeError.message })
          .eq('id', job.id);
        return;
      }
      
      console.log('[useEnrichmentJob] Edge function invoked successfully:', invokeData);
      toast.success('Enrichment started! You can leave this page and come back later.');
    } catch (error) {
      console.error('[useEnrichmentJob] Error starting enrichment:', error);
      toast.error('Failed to start enrichment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user, products, attributes]);

  const cancelEnrichment = useCallback(async () => {
    if (!currentJob?.id) return;

    try {
      await supabase
        .from('enrichment_jobs')
        .update({ status: 'cancelled' })
        .eq('id', currentJob.id);

      setCurrentJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      toast.info('Enrichment cancelled');
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Failed to cancel enrichment');
    }
  }, [currentJob?.id]);

  const downloadResults = useCallback(() => {
    if (!currentJob?.results || !products.length) {
      toast.error('No results to download');
      return;
    }

    // Build enriched products from results
    const enrichedProducts = products.map(product => {
      const result = currentJob.results[product.id];
      return {
        ...product,
        status: (result?.status || 'pending') as Product['status'],
        enrichedData: result?.data,
        error: result?.error,
      };
    });

    const blob = exportToExcel(enrichedProducts, attributes);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enriched_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currentJob, products, attributes]);

  const clearData = useCallback(() => {
    setProducts([]);
    setAttributes([]);
    setCurrentJob(null);
  }, []);

  const resetEnrichment = useCallback(async () => {
    if (currentJob?.id) {
      await supabase
        .from('enrichment_jobs')
        .delete()
        .eq('id', currentJob.id);
    }
    setCurrentJob(null);
  }, [currentJob?.id]);

  // Get products with current enrichment status
  const enrichedProducts = products.map(product => {
    const result = currentJob?.results?.[product.id];
    if (!result) return { ...product, status: 'pending' as const };
    return {
      ...product,
      status: result.status as Product['status'],
      enrichedData: result.data,
      error: result.error,
    };
  });

  return {
    products: enrichedProducts,
    attributes,
    stats,
    isEnriching,
    isComplete,
    isLoading,
    loadData,
    startEnrichment,
    cancelEnrichment,
    downloadResults,
    clearData,
    resetEnrichment,
    currentJob,
  };
}
