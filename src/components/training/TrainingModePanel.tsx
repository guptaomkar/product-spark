import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectorMapping } from '@/types/training';
import { useTraining } from '@/hooks/useTraining';
import { SelectorList } from './SelectorList';
import { ColumnMappingDialog } from './ColumnMappingDialog';
import { SelectorCaptureTool } from './SelectorCaptureTool';
import { Globe, Play, Save, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface TrainingModePanelProps {
  onComplete?: () => void;
}

export function TrainingModePanel({ onComplete }: TrainingModePanelProps) {
  const { saveTraining, isLoading } = useTraining();
  
  const [manufacturer, setManufacturer] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [selectors, setSelectors] = useState<SelectorMapping[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingSelector, setPendingSelector] = useState<Partial<SelectorMapping> | null>(null);

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
    toast.success('Ready! Use the selector tool below to capture elements from the product page.');
  }, [testUrl, manufacturer]);

  const handleSelectorCaptured = useCallback((selector: string, type: 'css' | 'xpath') => {
    setPendingSelector({
      id: crypto.randomUUID(),
      xpath: type === 'xpath' ? selector : '',
      cssSelector: type === 'css' ? selector : '',
      type: 'text',
    });
    setIsDialogOpen(true);
  }, []);

  const handleAddManualSelector = useCallback(() => {
    setPendingSelector({
      id: crypto.randomUUID(),
      xpath: '',
      cssSelector: '',
      type: 'text',
    });
    setIsDialogOpen(true);
  }, []);

  const handleSaveSelector = useCallback((mapping: SelectorMapping) => {
    setSelectors(prev => [...prev, mapping]);
    setPendingSelector(null);
    setIsDialogOpen(false);
    toast.success(`Selector for "${mapping.columnName}" added`);
  }, []);

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
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Training Mode
          </CardTitle>
          <CardDescription>
            Train the system to extract assets from manufacturer product pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manufacturer Input */}
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer Name</Label>
            <Input
              id="manufacturer"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g., Texas Instruments, Analog Devices"
              disabled={isPageLoaded}
            />
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="testUrl">Test Product Page URL</Label>
            <div className="flex gap-2">
              <Input
                id="testUrl"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://manufacturer.com/product/example"
                disabled={isPageLoaded}
                className="flex-1"
              />
              {!isPageLoaded && (
                <Button onClick={handleLoadPage} disabled={!testUrl || !manufacturer}>
                  <Play className="w-4 h-4 mr-2" />
                  Load
                </Button>
              )}
            </div>
          </div>

          {/* Page Ready Info & Selector Tool */}
          {isPageLoaded && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent/30 border border-accent">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-accent-foreground" />
                  <span className="text-sm font-medium">Page Ready: {manufacturer}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(testUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open Product Page
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selector Capture Tool */}
      {isPageLoaded && (
        <SelectorCaptureTool onSelectorCaptured={handleSelectorCaptured} />
      )}

      {/* Add Manual Selector Button */}
      {isPageLoaded && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleAddManualSelector}>
            Or Add Selector Manually
          </Button>
        </div>
      )}

      {/* Selector List */}
      {selectors.length > 0 && (
        <SelectorList
          selectors={selectors}
          onRemove={handleRemoveSelector}
        />
      )}

      {/* Action Buttons */}
      {isPageLoaded && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button
            onClick={handleSaveTraining}
            disabled={selectors.length === 0 || isLoading}
            variant="glow"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Training'}
          </Button>
        </div>
      )}

      {/* Column Mapping Dialog */}
      <ColumnMappingDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        pendingSelector={pendingSelector}
        onSave={handleSaveSelector}
      />
    </div>
  );
}
