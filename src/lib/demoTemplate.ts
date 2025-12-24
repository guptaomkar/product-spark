import * as XLSX from 'xlsx';

interface DemoTemplateData {
  MPN: string;
  'Product URL': string;
  'Image URL': string;
  'PDF URL': string;
}

export function generateDemoTemplate(): void {
  // Create sample data for the demo template
  const enrichmentData = [
    {
      'MPN': 'ABC-12345',
      'Product Name': 'Sample Product 1',
      'Manufacturer': 'Sample Manufacturer',
      'Category': 'Electronics'
    },
    {
      'MPN': 'DEF-67890',
      'Product Name': 'Sample Product 2',
      'Manufacturer': 'Sample Manufacturer',
      'Category': 'Hardware'
    },
    {
      'MPN': 'GHI-11223',
      'Product Name': 'Sample Product 3',
      'Manufacturer': 'Another Manufacturer',
      'Category': 'Components'
    }
  ];

  const attributesData = [
    {
      'Attribute Name': 'Weight',
      'Unit': 'kg',
      'Description': 'Product weight in kilograms'
    },
    {
      'Attribute Name': 'Dimensions',
      'Unit': 'mm',
      'Description': 'Product dimensions (LxWxH)'
    },
    {
      'Attribute Name': 'Color',
      'Unit': '',
      'Description': 'Product color'
    },
    {
      'Attribute Name': 'Material',
      'Unit': '',
      'Description': 'Primary material'
    }
  ];

  const assetDownloadData: DemoTemplateData[] = [
    {
      'MPN': 'ABC-12345',
      'Product URL': 'https://example.com/product/abc-12345',
      'Image URL': 'https://example.com/images/abc-12345.jpg',
      'PDF URL': 'https://example.com/datasheets/abc-12345.pdf'
    },
    {
      'MPN': 'DEF-67890',
      'Product URL': 'https://example.com/product/def-67890',
      'Image URL': 'https://example.com/images/def-67890.jpg',
      'PDF URL': 'https://example.com/datasheets/def-67890.pdf'
    }
  ];

  // Create workbook with multiple sheets
  const workbook = XLSX.utils.book_new();

  // Add Products sheet
  const productsSheet = XLSX.utils.json_to_sheet(enrichmentData);
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');

  // Add Attributes sheet
  const attributesSheet = XLSX.utils.json_to_sheet(attributesData);
  XLSX.utils.book_append_sheet(workbook, attributesSheet, 'Attributes');

  // Add Asset Download sheet
  const assetsSheet = XLSX.utils.json_to_sheet(assetDownloadData);
  XLSX.utils.book_append_sheet(workbook, assetsSheet, 'Asset Download');

  // Add Instructions sheet
  const instructionsData = [
    { 'Sheet': 'Products', 'Description': 'List your products with MPN (required), Product Name, Manufacturer, and Category columns' },
    { 'Sheet': 'Attributes', 'Description': 'Define attributes to extract with Attribute Name, Unit, and Description' },
    { 'Sheet': 'Asset Download', 'Description': 'For bulk asset downloads - include MPN and URL columns for images or PDFs' },
    { 'Sheet': '', 'Description': '' },
    { 'Sheet': 'Notes:', 'Description': '' },
    { 'Sheet': '1.', 'Description': 'MPN column is required and will be used as the unique identifier' },
    { 'Sheet': '2.', 'Description': 'For AI Enrichment, upload with Products + Attributes sheets' },
    { 'Sheet': '3.', 'Description': 'For Asset Download, upload with MPN and URL columns' },
    { 'Sheet': '4.', 'Description': 'URLs must be valid and accessible' },
  ];
  const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Generate and download file
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'DataEnrichr_Template.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
