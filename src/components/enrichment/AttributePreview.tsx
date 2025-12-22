import { AttributeDefinition } from '@/types/enrichment';
import { getAllCategories, getAttributesForCategory } from '@/lib/fileParser';
import { Tags } from 'lucide-react';

interface AttributePreviewProps {
  attributes: AttributeDefinition[];
}

export function AttributePreview({ attributes }: AttributePreviewProps) {
  const categories = getAllCategories(attributes);

  return (
    <div className="bg-card border border-border rounded-lg p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Tags className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Attribute Mapping Preview</h3>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => {
          const categoryAttrs = getAttributesForCategory(category, attributes);
          return (
            <div key={category} className="p-4 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm font-medium text-foreground mb-2">{category}</p>
              <div className="flex flex-wrap gap-1">
                {categoryAttrs.map(attr => (
                  <span 
                    key={attr} 
                    className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    {attr}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {categoryAttrs.length} attribute{categoryAttrs.length !== 1 ? 's' : ''}
              </p>
            </div>
          );
        })}
      </div>
      
      {categories.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">
          No attributes loaded yet
        </p>
      )}
    </div>
  );
}
