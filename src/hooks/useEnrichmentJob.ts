import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function mapDbItemToEnrichmentItem(item: any): EnrichmentItem {
  return {
    id: item.id,
    productId: item.product_id,
    mfr: item.mfr || '',
    mpn: item.mpn || '',
    category: item.category || '',
    status: item.status,
    data: (item.data as Record<string, string> | null) ?? undefined,
    error: item.error || undefined,
  };
}

export function useEnrichmentJob() {
  const { user } = useAuth();
  const [currentRun, setCurrentRun] = useState<EnrichmentRun | null>(null);
  const [runItems, setRunItems] = useState<EnrichmentItem[]>([]);
  const [uploadedProducts, setUploadedProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const lastRunStatusRef = useRef<string | null>(null);

  // Compute stats from run
  const stats: EnrichmentStats = useMemo(() => {
    return currentRun
      ? {
          total: currentRun.totalCount,
          pending: Math.max(0, currentRun.totalCount - currentRun.currentIndex),
          processing:
            currentRun.status === 'processing'
              ? Math.min(5, Math.max(0, currentRun.totalCount - currentRun.currentIndex))
              : 0,
          success: currentRun.successCount,
          partial: 0,
          failed: currentRun.failedCount,
        }
      : {
          total: uploadedProducts.length,
          pending: uploadedProducts.length,
          processing: 0,
          success: 0,
          partial: 0,
          failed: 0,
        };
  }, [currentRun, uploadedProducts.length]);

  const isEnriching = currentRun?.status === 'processing' || currentRun?.status === 'pending';
  const isComplete = currentRun?.status === 'completed';

  const loadRunItems = useCallback(async (runId: string) => {
    const { data: items, error } = await supabase
      .from('enrichment_run_items')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('[useEnrichmentJob] Error loading run items:', error);
      return;
    }

    if (items) {
      const mappedItems = items.map(mapDbItemToEnrichmentItem);
      setRunItems(mappedItems);

      // Convert to products format for display
      const productsList = mappedItems.map((item) => ({
        id: item.productId,
        mfr: item.mfr,
        mpn: item.mpn,
        category: item.category,
        status: item.status as Product['status'],
        enrichedData: item.data,
        error: item.error,
      }));
      setDisplayProducts(productsList);
    }
  }, []);

  // Load latest run on mount (active first; otherwise most recent completed/failed)
  useEffect(() => {
    if (!user) return;

    const loadLatestRun = async () => {
      const { data: activeRun, error: activeError } = await supabase
        .from('user_enrichment_data')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const runRow = activeRun
        ? activeRun
        : (
            await supabase
              .from('user_enrichment_data')
              .select('*')
              .eq('user_id', user.id)
              .in('status', ['completed', 'failed'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          ).data;

      if (!runRow || activeError) {
        return;
      }

      const attributesData = runRow.attributes as unknown as AttributeDefinition[];
      setCurrentRun({
        id: runRow.id,
        fileName: runRow.file_name,
        status: runRow.status as EnrichmentRun['status'],
        attributes: attributesData,
        currentIndex: (runRow as any).current_index || 0,
        totalCount: (runRow as any).total_count || runRow.products_count,
        successCount: (runRow as any).success_count || 0,
        failedCount: (runRow as any).failed_count || 0,
        createdAt: runRow.created_at,
        completedAt: (runRow as any).completed_at,
      });
      lastRunStatusRef.current = runRow.status;
      setAttributes(attributesData);
      await loadRunItems(runRow.id);
    };

    loadLatestRun();
  }, [user, loadRunItems]);

  // Poll progress (avoids Realtime WebSocket dependency)
  useEffect(() => {
    if (!currentRun?.id) return;

    const runId = currentRun.id;
    let isCancelled = false;

    const poll = async () => {
      const { data, error } = await supabase
        .from('user_enrichment_data')
        .select('status,current_index,success_count,failed_count,completed_at,total_count')
        .eq('id', runId)
        .maybeSingle();

      if (isCancelled || error || !data) return;

      const nextStatus = data.status as EnrichmentRun['status'];
      const prevStatus = lastRunStatusRef.current;
      if (prevStatus !== nextStatus) {
        lastRunStatusRef.current = nextStatus;
        if (nextStatus === 'completed') toast.success('Enrichment completed!');
        if (nextStatus === 'failed') toast.error('Enrichment failed');
      }

      setCurrentRun((prev) =>
        prev
          ? {
              ...prev,
              status: nextStatus,
              currentIndex: (data as any).current_index || 0,
              totalCount: (data as any).total_count || prev.totalCount,
              successCount: (data as any).success_count || 0,
              failedCount: (data as any).failed_count || 0,
              completedAt: (data as any).completed_at ?? prev.completedAt,
            }
          : prev
      );

      // Keep a small preview refreshed; fetch all on download
      await loadRunItems(runId);
    };

    poll();
    const interval = window.setInterval(poll, 3000);

    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, [currentRun?.id, loadRunItems]);

  const loadData = useCallback((result: FileValidationResult) => {
    setUploadedProducts(result.products);
    setDisplayProducts(result.products);
    setAttributes(result.attributes);
    setCurrentRun(null);
    setRunItems([]);
  }, []);

  const startEnrichment = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to start enrichment');
      return;
    }

    if (uploadedProducts.length === 0) {
      toast.error('Please upload data first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[useEnrichmentJob] Starting enrichment with', uploadedProducts.length, 'products');

      // 1. Create run in user_enrichment_data
      const { data: run, error: runError } = await supabase
        .from('user_enrichment_data')
        .insert({
          user_id: user.id,
          file_name: `enrichment_${new Date().toISOString().split('T')[0]}`,
          status: 'pending',
          products_count: uploadedProducts.length,
          attributes: JSON.parse(JSON.stringify(attributes)) as Json,
          results: [],
          total_count: uploadedProducts.length,
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
      const itemsToInsert = uploadedProducts.map((product) => ({
        run_id: run.id,
        product_id: product.id,
        mfr: product.mfr,
        mpn: product.mpn,
        category: product.category,
        status: 'pending',
      }));

      const { error: itemsError } = await supabase.from('enrichment_run_items').insert(itemsToInsert);

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
        totalCount: uploadedProducts.length,
        successCount: 0,
        failedCount: 0,
        createdAt: run.created_at,
      });
      lastRunStatusRef.current = 'pending';

      setRunItems(
        itemsToInsert.slice(0, 200).map((item, idx) => ({
          id: `temp-${idx}`,
          productId: item.product_id,
          mfr: item.mfr,
          mpn: item.mpn,
          category: item.category,
          status: 'pending',
        }))
      );

      // 4. Trigger background processing
      console.log('[useEnrichmentJob] Invoking enrich-batch edge function');
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('enrich-batch', {
        body: { runId: run.id, concurrency: 5 },
      });

      if (invokeError) {
        console.error('[useEnrichmentJob] Error invoking enrich-batch:', invokeError);
        toast.error('Error starting background processing: ' + invokeError.message);
        // Mark run as failed
        await supabase.from('user_enrichment_data').update({ status: 'failed' }).eq('id', run.id);
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
  }, [user, uploadedProducts, attributes]);

  const cancelEnrichment = useCallback(async () => {
    if (!currentRun?.id) return;

    try {
      await supabase.from('user_enrichment_data').update({ status: 'cancelled' }).eq('id', currentRun.id);

      setCurrentRun((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      toast.info('Enrichment cancelled');
    } catch (error) {
      console.error('Error cancelling run:', error);
      toast.error('Failed to cancel enrichment');
    }
  }, [currentRun?.id]);

  const downloadResults = useCallback(async () => {
    const runId = currentRun?.id;

    let items: EnrichmentItem[] = runItems;

    if (runId) {
      const all: any[] = [];
      const pageSize = 1000;

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('enrichment_run_items')
          .select('*')
          .eq('run_id', runId)
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('[useEnrichmentJob] Error fetching items for download:', error);
          toast.error('Failed to download results');
          return;
        }

        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
      }

      items = all.map(mapDbItemToEnrichmentItem);
    }

    if (items.length === 0) {
      toast.error('No results to download');
      return;
    }

    const enrichedProducts = items.map((item) => ({
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
  }, [currentRun?.id, runItems, attributes]);

  const clearData = useCallback(() => {
    setUploadedProducts([]);
    setDisplayProducts([]);
    setAttributes([]);
    setCurrentRun(null);
    setRunItems([]);
  }, []);

  const resetEnrichment = useCallback(async () => {
    if (currentRun?.id) {
      await supabase.from('user_enrichment_data').delete().eq('id', currentRun.id);
    }
    setCurrentRun(null);
    setRunItems([]);
  }, [currentRun?.id]);

  // Get products to render in the table
  const enrichedProducts = currentRun ? displayProducts : uploadedProducts;

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

