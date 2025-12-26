import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AttributeDefinition, EnrichmentStats, FileValidationResult, Product } from '@/types/enrichment';
import type { Json } from '@/integrations/supabase/types';
import { exportToExcel } from '@/lib/fileParser';

interface EnrichmentRun {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attributes: AttributeDefinition[];
  currentIndex: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

interface EnrichmentItem {
  id: string;
  productId: string;
  mfr: string;
  mpn: string;
  category: string;
  status: string;
  data?: Record<string, string>;
  error?: string;
}

export function useEnrichmentJob() {
  const { user } = useAuth();
  const [currentRun, setCurrentRun] = useState<EnrichmentRun | null>(null);
  const [runItems, setRunItems] = useState<EnrichmentItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Compute stats from run
  const stats: EnrichmentStats = currentRun ? {
    total: currentRun.totalCount,
    pending: currentRun.totalCount - currentRun.currentIndex,
    processing: currentRun.status === 'processing' ? Math.min(5, currentRun.totalCount - currentRun.currentIndex) : 0,
    success: currentRun.successCount,
    partial: 0,
    failed: currentRun.failedCount,
  } : {
    total: products.length,
    pending: products.length,
    processing: 0,
    success: 0,
    partial: 0,
    failed: 0,
  };

  const isEnriching = currentRun?.status === 'processing' || currentRun?.status === 'pending';
  const isComplete = currentRun?.status === 'completed';

  // Load active run on mount
  useEffect(() => {
    if (!user) return;

    const loadActiveRun = async () => {
      // Check for any pending/processing run
      const { data, error } = await supabase
        .from('user_enrichment_data')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const attributesData = data.attributes as unknown as AttributeDefinition[];
        setCurrentRun({
          id: data.id,
          fileName: data.file_name,
          status: data.status as EnrichmentRun['status'],
          attributes: attributesData,
          currentIndex: (data as any).current_index || 0,
          totalCount: (data as any).total_count || data.products_count,
          successCount: (data as any).success_count || 0,
          failedCount: (data as any).failed_count || 0,
          createdAt: data.created_at,
          completedAt: (data as any).completed_at,
        });
        setAttributes(attributesData);

        // Load items for this run
        await loadRunItems(data.id);
      }
    };

    loadActiveRun();
  }, [user]);

  const loadRunItems = async (runId: string) => {
    const { data: items, error } = await supabase
      .from('enrichment_run_items')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    if (items && !error) {
      const mappedItems = items.map(item => ({
        id: item.id,
        productId: item.product_id,
        mfr: item.mfr || '',
        mpn: item.mpn || '',
        category: item.category || '',
        status: item.status,
        data: item.data as Record<string, string> | undefined,
        error: item.error || undefined,
      }));
      setRunItems(mappedItems);
      
      // Convert to products format for display
      const productsList = mappedItems.map(item => ({
        id: item.productId,
        mfr: item.mfr,
        mpn: item.mpn,
        category: item.category,
        status: item.status as Product['status'],
        enrichedData: item.data,
        error: item.error,
      }));
      setProducts(productsList);
    }
  };

  // Subscribe to run updates for real-time progress
  useEffect(() => {
    if (!currentRun?.id) return;

    const channel = supabase
      .channel(`run-${currentRun.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_enrichment_data',
          filter: `id=eq.${currentRun.id}`,
        },
        (payload) => {
          const data = payload.new as any;
          setCurrentRun(prev => prev ? {
            ...prev,
            status: data.status,
            currentIndex: data.current_index || 0,
            successCount: data.success_count || 0,
            failedCount: data.failed_count || 0,
            completedAt: data.completed_at,
          } : null);

          if (data.status === 'completed') {
            toast.success('Enrichment completed!');
            // Reload items to get final results
            loadRunItems(currentRun.id);
          } else if (data.status === 'failed') {
            toast.error('Enrichment failed');
          }
        }
      )
      .subscribe();

    // Also subscribe to item updates for progress
    const itemsChannel = supabase
      .channel(`run-items-${currentRun.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'enrichment_run_items',
        },
        (payload) => {
          const data = payload.new as any;
          // Only update if it's for our run
          if (data.run_id === currentRun.id) {
            setRunItems(prev => prev.map(item => 
              item.id === data.id ? {
                ...item,
                status: data.status,
                data: data.data,
                error: data.error,
              } : item
            ));
            
            // Also update products
            setProducts(prev => prev.map(product => 
              product.id === data.product_id ? {
                ...product,
                status: data.status as Product['status'],
                enrichedData: data.data,
                error: data.error,
              } : product
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(itemsChannel);
    };
  }, [currentRun?.id]);

  const loadData = useCallback((result: FileValidationResult) => {
    setProducts(result.products);
    setAttributes(result.attributes);
    setCurrentRun(null);
    setRunItems([]);
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
      
      // 1. Create run in user_enrichment_data
      const { data: run, error: runError } = await supabase
        .from('user_enrichment_data')
        .insert({
          user_id: user.id,
          file_name: `enrichment_${new Date().toISOString().split('T')[0]}`,
          status: 'pending',
          products_count: products.length,
          attributes: JSON.parse(JSON.stringify(attributes)) as Json,
          results: [],
          total_count: products.length,
          current_index: 0,
          success_count: 0,
          failed_count: 0,
        })
        .select()
        .single();

      if (runError || !run) {
        console.error('[useEnrichmentJob] Failed to create run:', runError);
        throw new Error(runError?.message || 'Failed to create run');
      }

      console.log('[useEnrichmentJob] Run created:', run.id);

      // 2. Insert all products as run items
      const itemsToInsert = products.map(product => ({
        run_id: run.id,
        product_id: product.id,
        mfr: product.mfr,
        mpn: product.mpn,
        category: product.category,
        status: 'pending',
      }));

      const { error: itemsError } = await supabase
        .from('enrichment_run_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('[useEnrichmentJob] Failed to create items:', itemsError);
        throw new Error(itemsError.message || 'Failed to create items');
      }

      console.log('[useEnrichmentJob] Items created:', itemsToInsert.length);

      // 3. Set local state
      setCurrentRun({
        id: run.id,
        fileName: run.file_name,
        status: 'pending',
        attributes: attributes,
        currentIndex: 0,
        totalCount: products.length,
        successCount: 0,
        failedCount: 0,
        createdAt: run.created_at,
      });

      setRunItems(itemsToInsert.map((item, idx) => ({
        id: `temp-${idx}`,
        productId: item.product_id,
        mfr: item.mfr,
        mpn: item.mpn,
        category: item.category,
        status: 'pending',
      })));

      // 4. Trigger background processing
      console.log('[useEnrichmentJob] Invoking enrich-batch edge function');
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('enrich-batch', {
        body: { runId: run.id, concurrency: 5 },
      });

      if (invokeError) {
        console.error('[useEnrichmentJob] Error invoking enrich-batch:', invokeError);
        toast.error('Error starting background processing: ' + invokeError.message);
        // Mark run as failed
        await supabase
          .from('user_enrichment_data')
          .update({ status: 'failed' })
          .eq('id', run.id);
        return;
      }
      
      console.log('[useEnrichmentJob] Edge function invoked successfully:', invokeData);
      toast.success('Enrichment started! Processing continues even if you close this tab.');
    } catch (error) {
      console.error('[useEnrichmentJob] Error starting enrichment:', error);
      toast.error('Failed to start enrichment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user, products, attributes]);

  const cancelEnrichment = useCallback(async () => {
    if (!currentRun?.id) return;

    try {
      await supabase
        .from('user_enrichment_data')
        .update({ status: 'cancelled' })
        .eq('id', currentRun.id);

      setCurrentRun(prev => prev ? { ...prev, status: 'cancelled' } : null);
      toast.info('Enrichment cancelled');
    } catch (error) {
      console.error('Error cancelling run:', error);
      toast.error('Failed to cancel enrichment');
    }
  }, [currentRun?.id]);

  const downloadResults = useCallback(() => {
    if (runItems.length === 0) {
      toast.error('No results to download');
      return;
    }

    // Build enriched products from run items
    const enrichedProducts = runItems.map(item => ({
      id: item.productId,
      mfr: item.mfr,
      mpn: item.mpn,
      category: item.category,
      status: item.status as Product['status'],
      enrichedData: item.data,
      error: item.error,
    }));

    const blob = exportToExcel(enrichedProducts, attributes);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enriched_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [runItems, attributes]);

  const clearData = useCallback(() => {
    setProducts([]);
    setAttributes([]);
    setCurrentRun(null);
    setRunItems([]);
  }, []);

  const resetEnrichment = useCallback(async () => {
    if (currentRun?.id) {
      await supabase
        .from('user_enrichment_data')
        .delete()
        .eq('id', currentRun.id);
    }
    setCurrentRun(null);
    setRunItems([]);
  }, [currentRun?.id]);

  // Get products with current enrichment status
  const enrichedProducts = runItems.length > 0 
    ? runItems.map(item => ({
        id: item.productId,
        mfr: item.mfr,
        mpn: item.mpn,
        category: item.category,
        status: item.status as Product['status'],
        enrichedData: item.data,
        error: item.error,
      }))
    : products;

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
    currentRun,
  };
}
