import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectorMapping } from '@/types/training';
import { toast } from 'sonner';

interface ColumnMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pendingSelector: Partial<SelectorMapping> | null;
  onSave: (mapping: SelectorMapping) => void;
  isEditing?: boolean;
}

export function ColumnMappingDialog({
  isOpen,
  onClose,
  pendingSelector,
  onSave,
  isEditing = false,
}: ColumnMappingDialogProps) {
  const [columnName, setColumnName] = useState('');
  const [selectorType, setSelectorType] = useState<SelectorMapping['type']>('text');
  const [cssSelector, setCssSelector] = useState('');
  const [xpath, setXpath] = useState('');

  useEffect(() => {
    if (pendingSelector) {
      setCssSelector(pendingSelector.cssSelector || '');
      setXpath(pendingSelector.xpath || '');
      setSelectorType(pendingSelector.type || 'text');
      setColumnName(pendingSelector.columnName || '');
    }
  }, [pendingSelector]);

  const handleSave = () => {
    if (!columnName.trim()) {
      toast.error('Please enter a column name');
      return;
    }

    if (!cssSelector.trim() && !xpath.trim()) {
      toast.error('Please enter a CSS selector or XPath');
      return;
    }

    onSave({
      id: pendingSelector?.id || crypto.randomUUID(),
      columnName: columnName.trim(),
      type: selectorType,
      cssSelector: cssSelector.trim(),
      xpath: xpath.trim(),
      previewValue: pendingSelector?.previewValue,
    });

    setColumnName('');
    setCssSelector('');
    setXpath('');
    setSelectorType('text');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Selector Mapping' : 'Map Element to Column'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the selector configuration' : 'Define how this element should be extracted and stored'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector Input */}
          <div className="space-y-2">
            <Label htmlFor="cssSelector">CSS Selector</Label>
            <Input
              id="cssSelector"
              value={cssSelector}
              onChange={(e) => setCssSelector(e.target.value)}
              placeholder="e.g., .product-image img, #datasheet-link"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="xpath">XPath (alternative)</Label>
            <Input
              id="xpath"
              value={xpath}
              onChange={(e) => setXpath(e.target.value)}
              placeholder="e.g., //img[@class='product-image']"
              className="font-mono text-sm"
            />
          </div>

          {/* Element Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Element Type</Label>
            <Select value={selectorType} onValueChange={(v) => setSelectorType(v as SelectorMapping['type'])}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image URL</SelectItem>
                <SelectItem value="link">Link/Href</SelectItem>
                <SelectItem value="text">Text Content</SelectItem>
                <SelectItem value="datasheet">Datasheet Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="columnName">Output Column Name</Label>
            <Input
              id="columnName"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="e.g., Product Image, Datasheet URL"
            />
            <p className="text-xs text-muted-foreground">
              This will be the column header in your exported data
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Update Mapping' : 'Save Mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
