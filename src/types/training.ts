export interface SelectorMapping {
  id: string;
  xpath: string;
  cssSelector: string;
  columnName: string;
  type: 'image' | 'link' | 'text' | 'datasheet';
  previewValue?: string;
}

export interface ManufacturerTraining {
  id: string;
  manufacturer: string;
  test_url: string;
  selectors: SelectorMapping[];
  created_at: string;
  updated_at: string;
}

export interface TrainingMode {
  isActive: boolean;
  currentUrl: string;
  manufacturer: string;
  selectors: SelectorMapping[];
}

export interface BulkScrapeResult {
  productId: string;
  url: string;
  success: boolean;
  extractedData: Record<string, string>;
  errors?: string[];
}
