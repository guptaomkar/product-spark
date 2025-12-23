import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ManufacturerTraining, BulkScrapeResult } from '@/types/training';
import { supabase } from '@/integrations/supabase/client';
import { Download, Play, Loader2, CheckCircle, XCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { AssetDownloadPanel } from './AssetDownloadPanel';

interface BulkScrapePanelProps {
  trainings: ManufacturerTraining[];
}

export function BulkScrapePanel({ trainings }: BulkScrapePanelProps) {
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [urls, setUrls] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BulkScrapeResult[]>([]);
  const [progress, setProgress] = useState(0);

  const selectedTraining = trainings.find(t => t.manufacturer === selectedManufacturer);

  const handleStartScraping = useCallback(async () => {
    if (!selectedTraining) {
      toast.error('Please select a manufacturer');
      return;
    }

    const urlList = urls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urlList.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setProgress(0);

    const allResults: BulkScrapeResult[] = [];

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      
      try {
        const { data, error } = await supabase.functions.invoke('scrape-assets', {
          body: {
            url,
            selectors: selectedTraining.selectors,
          },
        });

        if (error) throw error;

        allResults.push({
          productId: `product-${i + 1}`,
          url,
          success: data.success,
          extractedData: data.extractedData || {},
          errors: data.errors,
        });
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        allResults.push({
          productId: `product-${i + 1}`,
          url,
          success: false,
          extractedData: {},
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
      }

      setProgress(((i + 1) / urlList.length) * 100);
      setResults([...allResults]);
    }

    setIsProcessing(false);
    toast.success(`Completed scraping ${urlList.length} URLs`);
  }, [selectedTraining, urls]);

  const handleDownloadResults = useCallback(() => {
    if (results.length === 0) return;

    // Get all unique column names from extracted data
    const allColumns = new Set<string>();
    results.forEach(r => {
      Object.keys(r.extractedData).forEach(k => allColumns.add(k));
    });

    // Create worksheet data
    const wsData = results.map(result => {
      const row: Record<string, string> = {
        URL: result.url,
        Status: result.success ? 'Success' : 'Failed',
      };

      allColumns.forEach(col => {
        row[col] = result.extractedData[col] || '';
      });

      if (!result.success && result.errors) {
        row['Errors'] = result.errors.join('; ');
      }

      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Scraped Assets');
    XLSX.writeFile(wb, `bulk_scrape_${selectedManufacturer}_${Date.now()}.xlsx`);
    
    toast.success('Results downloaded successfully');
  }, [results, selectedManufacturer]);

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Bulk Asset Scraping
        </CardTitle>
        <CardDescription>
          Use trained rules to extract assets from multiple product URLs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manufacturer Selection */}
        <div className="space-y-2">
          <Label>Select Manufacturer Training</Label>
          <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a trained manufacturer..." />
            </SelectTrigger>
            <SelectContent>
              {trainings.map(training => (
                <SelectItem key={training.id} value={training.manufacturer}>
                  <span className="capitalize">{training.manufacturer}</span>
                  <span className="text-muted-foreground ml-2">
                    ({training.selectors.length} selectors)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* URL Input */}
        {selectedTraining && (
          <>
            <div className="space-y-2">
              <Label>Product URLs (one per line)</Label>
              <Textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder={`https://${selectedManufacturer}.com/product/12345\nhttps://${selectedManufacturer}.com/product/67890`}
                rows={6}
                className="font-mono text-sm"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                {urls.split('\n').filter(u => u.trim()).length} URLs entered
              </p>
            </div>

            {/* Active Selectors Preview */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-2">Active Selectors:</p>
              <div className="flex flex-wrap gap-2">
                {selectedTraining.selectors.map(s => (
                  <span
                    key={s.id}
                    className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
                  >
                    {s.columnName}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Results Summary */}
            {results.length > 0 && !isProcessing && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/30 border border-accent">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{successCount} success</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{failedCount} failed</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                onClick={handleStartScraping}
                disabled={isProcessing || !urls.trim()}
                variant="glow"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>

              {results.length > 0 && !isProcessing && (
                <Button onClick={handleDownloadResults} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Results
                </Button>
              )}
            </div>

          </>
        )}

        {/* Asset Download (always visible) */}
        <AssetDownloadPanel results={results} />

        {trainings.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No trainings available. Create one in Training Mode first.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
