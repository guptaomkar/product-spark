export interface Product {
  id: string;
  mfr: string;
  mpn: string;
  category: string;
  status: EnrichmentStatus;
  enrichedData?: Record<string, string>;
  error?: string;
}

export interface AttributeDefinition {
  category: string;
  attributeName: string;
}

export type EnrichmentStatus = 'pending' | 'processing' | 'success' | 'partial' | 'failed';

export interface EnrichmentResult {
  manufacturer: string;
  part_number: string;
  category: string;
  attributes: Record<string, string>;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  products: Product[];
  attributes: AttributeDefinition[];
}

export interface EnrichmentStats {
  total: number;
  pending: number;
  processing: number;
  success: number;
  partial: number;
  failed: number;
}
