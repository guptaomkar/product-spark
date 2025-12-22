import { useState, useCallback, useMemo } from 'react';
import { Product, AttributeDefinition, EnrichmentStats, FileValidationResult } from '@/types/enrichment';
import { getAttributesForCategory, exportToExcel } from '@/lib/fileParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    
    setIsEnriching(true);
    
    // Process products sequentially to avoid rate limiting
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (product.status !== 'pending') continue;
      
      // Update status to processing
      setProducts(prev => prev.map((p, idx) => 
        idx === i ? { ...p, status: 'processing' as const } : p
      ));
      
      try {
        const categoryAttributes = getAttributesForCategory(product.category, attributes);
        const enrichedData = await enrichProduct(product, categoryAttributes);
        
        // Check if we got all values or just some
        const filledValues = Object.values(enrichedData).filter(v => v !== '').length;
        const status = filledValues === categoryAttributes.length ? 'success' : 
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
  }, [isEnriching, products, attributes]);

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
  };
}
