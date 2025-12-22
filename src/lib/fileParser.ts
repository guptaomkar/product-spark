import * as XLSX from 'xlsx';
import { Product, AttributeDefinition, FileValidationResult } from '@/types/enrichment';

function generateId(): string {
  return crypto.randomUUID();
}

export function parseExcelFile(file: File): Promise<FileValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const errors: string[] = [];
        const products: Product[] = [];
        const attributes: AttributeDefinition[] = [];
        
        // Validate Sheet 1: Product Master
        const productSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!productSheet) {
          errors.push('Sheet 1 (Product Master) is missing');
        } else {
          const productData = XLSX.utils.sheet_to_json<Record<string, string>>(productSheet);
          
          if (productData.length === 0) {
            errors.push('Sheet 1 (Product Master) is empty');
          } else {
            // Check required columns
            const firstRow = productData[0];
            const hasRequiredCols = ['MFR', 'MPN', 'Category'].every(col => 
              Object.keys(firstRow).some(key => key.toUpperCase() === col.toUpperCase())
            );
            
            if (!hasRequiredCols) {
              errors.push('Sheet 1 must contain columns: MFR, MPN, Category');
            } else {
              productData.forEach((row, index) => {
                const mfr = findColumnValue(row, 'MFR');
                const mpn = findColumnValue(row, 'MPN');
                const category = findColumnValue(row, 'Category');
                
                if (!mfr || !mpn || !category) {
                  errors.push(`Row ${index + 2}: Missing required data (MFR, MPN, or Category)`);
                } else {
                  products.push({
                    id: generateId(),
                    mfr: mfr.trim(),
                    mpn: mpn.trim(),
                    category: category.trim(),
                    status: 'pending'
                  });
                }
              });
            }
          }
        }
        
        // Validate Sheet 2: Attribute Definition
        const attributeSheet = workbook.Sheets[workbook.SheetNames[1]];
        if (!attributeSheet) {
          errors.push('Sheet 2 (Attribute Definition) is missing');
        } else {
          const attributeData = XLSX.utils.sheet_to_json<Record<string, string>>(attributeSheet);
          
          if (attributeData.length === 0) {
            errors.push('Sheet 2 (Attribute Definition) is empty');
          } else {
            const firstRow = attributeData[0];
            const hasRequiredCols = ['Category', 'Attribute Name'].every(col =>
              Object.keys(firstRow).some(key => 
                key.toUpperCase().replace(/\s+/g, '') === col.toUpperCase().replace(/\s+/g, '')
              )
            );
            
            if (!hasRequiredCols) {
              errors.push('Sheet 2 must contain columns: Category, Attribute Name');
            } else {
              attributeData.forEach((row, index) => {
                const category = findColumnValue(row, 'Category');
                const attributeName = findColumnValue(row, 'Attribute Name') || findColumnValue(row, 'AttributeName');
                
                if (!category || !attributeName) {
                  errors.push(`Attribute row ${index + 2}: Missing Category or Attribute Name`);
                } else {
                  attributes.push({
                    category: category.trim(),
                    attributeName: attributeName.trim()
                  });
                }
              });
            }
          }
        }
        
        resolve({
          isValid: errors.length === 0,
          errors,
          products,
          attributes
        });
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx file.'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function findColumnValue(row: Record<string, string>, columnName: string): string | undefined {
  const normalizedName = columnName.toUpperCase().replace(/\s+/g, '');
  const key = Object.keys(row).find(k => 
    k.toUpperCase().replace(/\s+/g, '') === normalizedName
  );
  return key ? String(row[key]) : undefined;
}

export function getAttributesForCategory(
  category: string,
  attributes: AttributeDefinition[]
): string[] {
  return attributes
    .filter(attr => attr.category.toLowerCase() === category.toLowerCase())
    .map(attr => attr.attributeName);
}

export function getAllCategories(attributes: AttributeDefinition[]): string[] {
  return [...new Set(attributes.map(attr => attr.category))];
}

export function exportToExcel(
  products: Product[],
  attributes: AttributeDefinition[]
): Blob {
  // Get all unique attribute names
  const allAttributes = [...new Set(attributes.map(a => a.attributeName))];
  
  // Create export data
  const exportData = products.map(product => {
    const row: Record<string, string> = {
      MFR: product.mfr,
      MPN: product.mpn,
      Category: product.category,
      Status: product.status
    };
    
    // Add attribute columns
    allAttributes.forEach(attr => {
      row[attr] = product.enrichedData?.[attr] || '';
    });
    
    return row;
  });
  
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Enriched Data');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
