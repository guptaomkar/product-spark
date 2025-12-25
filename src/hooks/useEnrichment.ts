import { useCallback, useMemo, useState } from 'react';
import type {
  AttributeDefinition,
  EnrichmentStats,
  FileValidationResult,
  Product,
} from '@/types/enrichment';
import { exportToExcel, getAttributesForCategory } from '@/lib/fileParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUsageTracking } from './useUsageTracking';

// Real enrichment using Oxylabs API via edge function
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const enrichProduct = async (
  product: Product,
  attributes: string[]
): Promise<Record<string, string>> => {
  console.log(`[enrichProduct] Calling edge function for ${product.mfr} ${product.mpn}`);

  const { data, error } = await supabase.functions.invoke('enrich-product', {
    body: {
      mfr: product.mfr,
      mpn: product.mpn,
      attributes,
    },
  });

  if (error) {
    console.error('[enrichProduct] Edge function error:', error);
    throw new Error(error.message || 'Failed to call enrichment service');
  }

  if (!data?.success) {
    console.error('[enrichProduct] Enrichment failed:', data?.error);
    throw new Error(data?.error || 'Enrichment failed');
  }

  return data.data || {};
};

export function useEnrichment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  const { canMakeRequest, consumeCredit, showUpgradePrompt, refreshCredits } = useUsageTracking();

  const stats = useMemo<EnrichmentStats>(() => {
    return {
      total: products.length,
      pending: products.filter((p) => p.status === 'pending').length,
      processing: products.filter((p) => p.status === 'processing').length,
      success: products.filter((p) => p.status === 'success').length,
      partial: products.filter((p) => p.status === 'partial').length,
      failed: products.filter((p) => p.status === 'failed').length,
    };
  }, [products]);

  const loadData = useCallback((result: FileValidationResult) => {
    setProducts(result.products);
    setAttributes(result.attributes);
  }, []);

  const startEnrichment = useCallback(async () => {
    if (isEnriching || products.length === 0) return;

    if (!canMakeRequest) {
      toast.error(showUpgradePrompt ? 'Trial limit reached. Please sign up to continue.' : 'No credits remaining. Please upgrade your plan.');
      return;
    }

    const pendingIndices = products
      .map((p, idx) => (p.status === 'pending' ? idx : -1))
      .filter((idx) => idx !== -1);

    if (pendingIndices.length === 0) {
      toast.info('No pending products to enrich.');
      return;
    }

    setIsEnriching(true);

    try {
      for (const idx of pendingIndices) {
        const product = products[idx];

        const creditConsumed = await consumeCredit('enrichment', {
          mfr: product.mfr,
          mpn: product.mpn,
          category: product.category,
        });

        if (!creditConsumed) {
          // Mark all remaining pending products as failed so the run can finish and allow download.
          setProducts((prev) =>
            prev.map((p) =>
              p.status === 'pending'
                ? {
                    ...p,
                    status: 'failed' as const,
                    error: 'Not processed: no credits remaining (or credit consumption failed).',
                  }
                : p
            )
          );

          toast.error('No credits remaining. Stopping enrichment.');
          break;
        }

        // Set processing
        setProducts((prev) =>
          prev.map((p, pIdx) => (pIdx === idx ? { ...p, status: 'processing' as const } : p))
        );

        try {
          const categoryAttributes = getAttributesForCategory(product.category, attributes);
          const enrichedData = await withTimeout(
            enrichProduct(product, categoryAttributes),
            60000,
            `Enrichment for ${product.mfr} ${product.mpn}`
          );

          const filledValues = Object.values(enrichedData).filter((v) => v !== '').length;
          const fillRate = categoryAttributes.length > 0 ? filledValues / categoryAttributes.length : 0;
          const status = fillRate >= 0.7 ? 'success' : filledValues > 0 ? 'partial' : 'failed';

          setProducts((prev) =>
            prev.map((p, pIdx) => (pIdx === idx ? { ...p, status, enrichedData } : p))
          );
        } catch (error) {
          setProducts((prev) =>
            prev.map((p, pIdx) =>
              pIdx === idx
                ? {
                    ...p,
                    status: 'failed' as const,
                    error: error instanceof Error ? error.message : 'Unknown error',
                  }
                : p
            )
          );
        }
      }

      toast.success('Enrichment completed');
    } finally {
      await refreshCredits();
      setIsEnriching(false);
    }
  }, [isEnriching, products, attributes, canMakeRequest, consumeCredit, refreshCredits, showUpgradePrompt]);

  const resetEnrichment = useCallback(() => {
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        status: 'pending' as const,
        enrichedData: undefined,
        error: undefined,
      }))
    );
  }, []);

  const downloadResults = useCallback(() => {
    const blob = exportToExcel(products, attributes);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enriched_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [products, attributes]);

  const clearData = useCallback(() => {
    setProducts([]);
    setAttributes([]);
  }, []);

  return {
    products,
    attributes,
    stats,
    isEnriching,
    loadData,
    startEnrichment,
    resetEnrichment,
    downloadResults,
    clearData,
    canMakeRequest,
    showUpgradePrompt,
  };
}
