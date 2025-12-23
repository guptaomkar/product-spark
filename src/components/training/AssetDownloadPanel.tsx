import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Download,
  FileArchive,
  Loader2,
  CheckCircle,
  XCircle,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { BulkScrapeResult } from '@/types/training';

interface AssetDownloadPanelProps {
  results: BulkScrapeResult[];
  mpnColumn?: string;
}

interface DownloadProgress {
  current: number;
  total: number;
  currentFile: string;
}

interface DownloadResult {
  mpn: string;
  url: string;
  success: boolean;
  error?: string;
  type: 'image' | 'pdf' | 'unknown';
}

export function AssetDownloadPanel({ results, mpnColumn = 'MPN' }: AssetDownloadPanelProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [downloadResults, setDownloadResults] = useState<DownloadResult[]>([]);

  const getFileExtension = (url: string, contentType?: string): string => {
    // Try to get extension from URL
    const urlPath = url.split('?')[0];
    const urlExt = urlPath.split('.').pop()?.toLowerCase();
    
    if (urlExt && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'].includes(urlExt)) {
      return urlExt === 'jpeg' ? 'jpg' : urlExt;
    }

    // Fall back to content type
    if (contentType) {
      if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
      if (contentType.includes('png')) return 'png';
      if (contentType.includes('gif')) return 'gif';
      if (contentType.includes('webp')) return 'webp';
      if (contentType.includes('svg')) return 'svg';
      if (contentType.includes('pdf')) return 'pdf';
    }

    return 'bin';
  };

  const getAssetType = (url: string): 'image' | 'pdf' | 'unknown' => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/)) return 'image';
    if (lowerUrl.match(/\.pdf(\?|$)/)) return 'pdf';
    if (lowerUrl.includes('image') || lowerUrl.includes('photo')) return 'image';
    if (lowerUrl.includes('datasheet') || lowerUrl.includes('pdf')) return 'pdf';
    return 'unknown';
  };

  const sanitizeFilename = (name: string): string => {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  };

  const downloadAsset = async (url: string): Promise<{ blob: Blob; contentType: string } | null> => {
    try {
      // Use a CORS proxy or direct fetch
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const contentType = response.headers.get('content-type') || '';
      
      return { blob, contentType };
    } catch (error) {
      console.error(`Failed to download ${url}:`, error);
      return null;
    }
  };

  const handleDownloadAssets = useCallback(async () => {
    // Collect all asset URLs from results
    const assets: { mpn: string; url: string; columnName: string }[] = [];

    results.forEach((result, index) => {
      const mpn = result.extractedData[mpnColumn] || `product_${index + 1}`;
      
      Object.entries(result.extractedData).forEach(([columnName, value]) => {
        if (!value) return;
        
        // Check if value looks like a URL (for images, datasheets, etc.)
        if (value.startsWith('http://') || value.startsWith('https://')) {
          assets.push({ mpn, url: value, columnName });
        }
      });
    });

    if (assets.length === 0) {
      toast.error('No downloadable assets found in results');
      return;
    }

    setIsDownloading(true);
    setDownloadResults([]);
    
    const zip = new JSZip();
    const downloadedResults: DownloadResult[] = [];
    
    // Group by MPN
    const assetsByMpn = new Map<string, typeof assets>();
    assets.forEach(asset => {
      const existing = assetsByMpn.get(asset.mpn) || [];
      existing.push(asset);
      assetsByMpn.set(asset.mpn, existing);
    });

    let processedCount = 0;
    const totalAssets = assets.length;

    for (const [mpn, mpnAssets] of assetsByMpn) {
      const sanitizedMpn = sanitizeFilename(mpn);
      const mpnFolder = zip.folder(sanitizedMpn);
      
      if (!mpnFolder) continue;

      for (const asset of mpnAssets) {
        setProgress({
          current: processedCount + 1,
          total: totalAssets,
          currentFile: `${mpn} - ${asset.columnName}`,
        });

        const assetType = getAssetType(asset.url);
        const result = await downloadAsset(asset.url);

        if (result) {
          const ext = getFileExtension(asset.url, result.contentType);
          const filename = `${sanitizeFilename(asset.columnName)}.${ext}`;
          mpnFolder.file(filename, result.blob);
          
          downloadedResults.push({
            mpn,
            url: asset.url,
            success: true,
            type: assetType,
          });
        } else {
          downloadedResults.push({
            mpn,
            url: asset.url,
            success: false,
            error: 'Failed to download',
            type: assetType,
          });
        }

        processedCount++;
        setDownloadResults([...downloadedResults]);
      }
    }

    // Generate and save ZIP
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(content, `assets_${timestamp}.zip`);
      
      const successCount = downloadedResults.filter(r => r.success).length;
      toast.success(`Downloaded ${successCount}/${totalAssets} assets`);
    } catch (error) {
      console.error('Failed to generate ZIP:', error);
      toast.error('Failed to create ZIP file');
    }

    setIsDownloading(false);
    setProgress(null);
  }, [results, mpnColumn]);

  // Count available assets
  const assetCount = results.reduce((count, result) => {
    return count + Object.values(result.extractedData).filter(
      v => v && (v.startsWith('http://') || v.startsWith('https://'))
    ).length;
  }, 0);

  const successCount = downloadResults.filter(r => r.success).length;
  const failedCount = downloadResults.filter(r => !r.success).length;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileArchive className="w-5 h-5 text-primary" />
          Asset Download
        </CardTitle>
        <CardDescription>
          {results.length === 0
            ? 'Run a bulk scrape to generate downloadable image/PDF URLs, then download them as a ZIP renamed by MPN.'
            : 'Download extracted images and PDFs, renamed by MPN'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Asset Summary */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">
              {assetCount} downloadable assets found
            </span>
          </div>
        </div>

        {/* Progress */}
        {isDownloading && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[60%]">
                {progress.currentFile}
              </span>
              <span className="font-medium">
                {progress.current}/{progress.total}
              </span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        )}

        {/* Download Results */}
        {downloadResults.length > 0 && !isDownloading && (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{successCount} downloaded</span>
              </div>
              {failedCount > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{failedCount} failed</span>
                </div>
              )}
            </div>

            {/* Failed Assets List */}
            {failedCount > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-medium text-red-400 mb-1">Failed downloads:</p>
                {downloadResults.filter(r => !r.success).map((r, i) => (
                  <div key={i} className="text-xs text-muted-foreground truncate">
                    {r.mpn}: {r.url}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownloadAssets}
          disabled={isDownloading || assetCount === 0}
          variant="outline"
          className="w-full"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Downloading Assets...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download All Assets as ZIP
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Assets will be organized in folders by MPN and named by attribute
        </p>
      </CardContent>
    </Card>
  );
}
