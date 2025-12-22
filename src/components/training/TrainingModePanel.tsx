import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectorMapping, ManufacturerTraining } from '@/types/training';
import { useTraining } from '@/hooks/useTraining';
import { SelectorList } from './SelectorList';
import { ColumnMappingDialog } from './ColumnMappingDialog';
import { Globe, Play, Save, Trash2, ExternalLink, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface TrainingModePanelProps {
  onComplete?: () => void;
  editingTraining?: ManufacturerTraining | null;
  onCancelEdit?: () => void;
}

export function TrainingModePanel({ onComplete, editingTraining, onCancelEdit }: TrainingModePanelProps) {
  const { saveTraining, isLoading } = useTraining();
  
  const [manufacturer, setManufacturer] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [selectors, setSelectors] = useState<SelectorMapping[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingSelector, setPendingSelector] = useState<Partial<SelectorMapping> | null>(null);
  const [isEditingSelector, setIsEditingSelector] = useState(false);

  // Load editing training data
  useEffect(() => {
    if (editingTraining) {
      setManufacturer(editingTraining.manufacturer);
      setTestUrl(editingTraining.test_url);
      setSelectors(editingTraining.selectors);
      setIsPageLoaded(true);
    }
  }, [editingTraining]);

  const handleLoadPage = useCallback(() => {
    if (!testUrl) {
      toast.error('Please enter a valid URL');
      return;
    }
    if (!manufacturer) {
      toast.error('Please enter a manufacturer name');
      return;
    }
    setIsPageLoaded(true);
    toast.success('Ready! Add selectors to capture elements from product pages.');
  }, [testUrl, manufacturer]);

  const handleAddSelector = useCallback(() => {
    setPendingSelector({
      id: crypto.randomUUID(),
      xpath: '',
      cssSelector: '',
      type: 'text',
    });
    setIsEditingSelector(false);
    setIsDialogOpen(true);
  }, []);

  const handleEditSelector = useCallback((selector: SelectorMapping) => {
    setPendingSelector(selector);
    setIsEditingSelector(true);
    setIsDialogOpen(true);
  }, []);

  const handleSaveSelector = useCallback((mapping: SelectorMapping) => {
    if (isEditingSelector) {
      setSelectors(prev => prev.map(s => s.id === mapping.id ? mapping : s));
      toast.success(`Selector for "${mapping.columnName}" updated`);
    } else {
      setSelectors(prev => [...prev, mapping]);
      toast.success(`Selector for "${mapping.columnName}" added`);
    }
    setPendingSelector(null);
    setIsEditingSelector(false);
    setIsDialogOpen(false);
  }, [isEditingSelector]);

  const handleRemoveSelector = useCallback((id: string) => {
    setSelectors(prev => prev.filter(s => s.id !== id));
    toast.info('Selector removed');
  }, []);

  const handleSaveTraining = useCallback(async () => {
    if (!manufacturer || !testUrl || selectors.length === 0) {
      toast.error('Please complete all fields and add at least one selector');
      return;
    }

    const success = await saveTraining(manufacturer, testUrl, selectors);
    if (success) {
      setManufacturer('');
      setTestUrl('');
      setSelectors([]);
      setIsPageLoaded(false);
      onComplete?.();
    }
  }, [manufacturer, testUrl, selectors, saveTraining, onComplete]);

  const handleClear = useCallback(() => {
    setManufacturer('');
    setTestUrl('');
    setSelectors([]);
    setIsPageLoaded(false);
    onCancelEdit?.();
  }, [onCancelEdit]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {editingTraining ? 'Edit Training' : 'Training Mode'}
              </CardTitle>
              <CardDescription>
                {editingTraining 
                  ? `Editing selectors for ${editingTraining.manufacturer}`
                  : 'Train the system to extract assets from manufacturer product pages using CSS selectors or XPath'
                }
              </CardDescription>
            </div>
            {editingTraining && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer Name</Label>
            <Input
              id="manufacturer"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g., Texas Instruments, Analog Devices"
              disabled={isPageLoaded || !!editingTraining}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testUrl">Test Product Page URL</Label>
            <div className="flex gap-2">
              <Input
                id="testUrl"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://manufacturer.com/product/example"
                disabled={isPageLoaded && !editingTraining}
                className="flex-1"
              />
              {!isPageLoaded && !editingTraining && (
                <Button onClick={handleLoadPage} disabled={!testUrl || !manufacturer}>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              )}
            </div>
          </div>

          {isPageLoaded && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent/30 border border-accent">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-accent-foreground" />
                  <span className="text-sm font-medium">
                    {editingTraining ? 'Editing' : 'Training'}: {manufacturer}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(testUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open Page
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium mb-2">How to get selectors:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open the product page in a new tab</li>
                  <li>Right-click on the element → Inspect</li>
                  <li>Right-click on the HTML → Copy → Copy XPath or Copy Selector</li>
                  <li>Click "Add Selector" and paste it</li>
                </ol>
              </div>

              <Button onClick={handleAddSelector} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Selector
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectors.length > 0 && (
        <SelectorList
          selectors={selectors}
          onRemove={handleRemoveSelector}
          onEdit={handleEditSelector}
        />
      )}

      {isPageLoaded && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-2" />
            {editingTraining ? 'Cancel' : 'Clear All'}
          </Button>
          <Button
            onClick={handleSaveTraining}
            disabled={selectors.length === 0 || isLoading}
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : editingTraining ? 'Update Training' : 'Save Training'}
          </Button>
        </div>
      )}

      <ColumnMappingDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setIsEditingSelector(false);
        }}
        pendingSelector={pendingSelector}
        onSave={handleSaveSelector}
        isEditing={isEditingSelector}
      />
    </div>
  );
}