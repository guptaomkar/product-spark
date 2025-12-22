import { useState, useCallback, useMemo } from 'react';
import { Product, AttributeDefinition, EnrichmentStats, FileValidationResult } from '@/types/enrichment';
import { getAttributesForCategory, exportToExcel } from '@/lib/fileParser';

// Simulated enrichment for demo purposes
const simulateEnrichment = async (
  product: Product, 
  attributes: string[]
): Promise<Record<string, string>> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Simulate occasional failures (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('AI service temporarily unavailable');
  }
  
  // Generate mock enriched data
  const enrichedData: Record<string, string> = {};
  attributes.forEach(attr => {
    // Simulate partial data (20% chance of empty value)
    if (Math.random() > 0.2) {
      enrichedData[attr] = generateMockValue(attr, product);
    } else {
      enrichedData[attr] = '';
    }
  });
  
  return enrichedData;
};

const generateMockValue = (attribute: string, product: Product): string => {
  const mockValues: Record<string, string[]> = {
    'Voltage': ['12V', '24V', '110V', '220V', '5V DC'],
    'Wattage': ['10W', '25W', '50W', '100W', '250W'],
    'Weight': ['0.5 kg', '1.2 kg', '2.5 kg', '5 kg', '10 kg'],
    'Dimensions': ['100x50x25mm', '200x100x50mm', '300x150x75mm'],
    'Material': ['Aluminum', 'Steel', 'Plastic', 'Copper', 'Composite'],
    'Color': ['Black', 'Silver', 'White', 'Gray', 'Blue'],
    'Temperature Range': ['-20°C to 60°C', '0°C to 85°C', '-40°C to 125°C'],
    'Certification': ['CE', 'UL', 'RoHS', 'FCC', 'ISO 9001'],
  };
  
  const values = mockValues[attribute] || [`${product.mfr} ${attribute} Spec`];
  return values[Math.floor(Math.random() * values.length)];
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
        const enrichedData = await simulateEnrichment(product, categoryAttributes);
        
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
