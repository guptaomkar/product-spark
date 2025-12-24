import { useState, useCallback, useMemo } from 'react';
import { Product, AttributeDefinition, EnrichmentStats, FileValidationResult } from '@/types/enrichment';
import { getAttributesForCategory, exportToExcel } from '@/lib/fileParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUsageTracking } from './useUsageTracking';

// Real enrichment using Oxylabs API via edge function
const enrichProduct = async (
  product: Product, 
  attributes: string[]
): Promise<Record<string, string>> => {
  console.log(`[enrichProduct] Calling edge function for ${product.mfr} ${product.mpn}`);
  
  const { data, error } = await supabase.functions.invoke('enrich-product', {
    body: { 
      mfr: product.mfr, 
      mpn: product.mpn, 
      attributes 
    }
  });

  if (error) {
    console.error('[enrichProduct] Edge function error:', error);
    throw new Error(error.message || 'Failed to call enrichment service');
  }

  if (!data.success) {
    console.error('[enrichProduct] Enrichment failed:', data.error);
    throw new Error(data.error || 'Enrichment failed');
  }

  console.log('[enrichProduct] Enrichment successful:', data.data);
  return data.data || {};
};

export function useEnrichment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const { canMakeRequest, consumeCredit, showUpgradePrompt, remainingCredits } = useUsageTracking();

  const stats = useMemo<EnrichmentStats>(() => {
    return {
      total: products.length,
      pending: products.filter(p => p.status === 'pending').length,
      processing: products.filter(p => p.status === 'processing').length,
      success: products.filter(p => p.status === 'success').length,
      partial: products.filter(p => p.status === 'partial').length,
      failed: products.filter(p => p.status === 'failed').length,
    };
  }, [products]);

  const loadData = useCallback((result: FileValidationResult) => {
    setProducts(result.products);
    setAttributes(result.attributes);
  }, []);

  const startEnrichment = useCallback(async () => {
    if (isEnriching || products.length === 0) return;
    
    // Check if user can make requests
    if (!canMakeRequest) {
      if (showUpgradePrompt) {
        toast.error('Trial limit reached. Please sign up to continue.');
      } else {
        toast.error('No credits remaining. Please upgrade your plan.');
      }
      return;
    }

    // Check if enough credits for all pending products
    const pendingCount = products.filter(p => p.status === 'pending').length;
    if (pendingCount > remainingCredits) {
      toast.warning(`You have ${remainingCredits} credits but ${pendingCount} products to enrich. Some products may not be processed.`);
    }
    
    setIsEnriching(true);
    
    // Process products sequentially to avoid rate limiting
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (product.status !== 'pending') continue;
      
      // Check and consume credit before each product
      if (!canMakeRequest) {
        toast.error('Credit limit reached. Stopping enrichment.');
        break;
      }

      const creditConsumed = await consumeCredit('enrichment');
      if (!creditConsumed) {
        toast.error('Failed to consume credit. Stopping enrichment.');
        break;
      }
      
      // Update status to processing
      setProducts(prev => prev.map((p, idx) => 
        idx === i ? { ...p, status: 'processing' as const } : p
      ));
      
      try {
        const categoryAttributes = getAttributesForCategory(product.category, attributes);
        const enrichedData = await enrichProduct(product, categoryAttributes);
        
        // Check fill rate - 70% or more = success
        const filledValues = Object.values(enrichedData).filter(v => v !== '').length;
        const fillRate = categoryAttributes.length > 0 ? filledValues / categoryAttributes.length : 0;
        const status = fillRate >= 0.7 ? 'success' : 
                       filledValues > 0 ? 'partial' : 'failed';
        
        setProducts(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status, enrichedData } : p
        ));
      } catch (error) {
        setProducts(prev => prev.map((p, idx) => 
          idx === i ? { 
            ...p, 
            status: 'failed' as const, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } : p
        ));
      }
    }
    
    setIsEnriching(false);
    toast.success('Enrichment completed');
  }, [isEnriching, products, attributes, canMakeRequest, consumeCredit, showUpgradePrompt, remainingCredits]);

  const resetEnrichment = useCallback(() => {
    setProducts(prev => prev.map(p => ({
      ...p,
      status: 'pending' as const,
      enrichedData: undefined,
      error: undefined
    })));
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
