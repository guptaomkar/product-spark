import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  FileArchive,
  Loader2,
  CheckCircle,
  XCircle,
  ImageIcon,
  FileText,
  Upload,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface DownloadProgress {
  current: number;
  total: number;
  currentFile: string;
}

interface DownloadResult {
  identifier: string;
  url: string;
  success: boolean;
  error?: string;
}

interface ParsedRow {
  identifier: string;
  url: string;
  rowIndex: number;
}

type AssetType = 'images' | 'pdfs';

export function AssetDownloadPanel() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [downloadResults, setDownloadResults] = useState<DownloadResult[]>([]);
  const [assetType, setAssetType] = useState<AssetType>('images');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [identifierColumn, setIdentifierColumn] = useState<string>('');
  const [urlColumn, setUrlColumn] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    setFileName(file.name);
    setParsedData([]);
    setDownloadResults([]);
    setRawData([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get headers
        const headerData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        if (headerData.length < 2) {
          toast.error('File must have at least a header row and one data row');
          setIsLoadingFile(false);
          return;
        }
        
        const headers = headerData[0].map(h => String(h || '').trim()).filter(h => h !== '');
        if (headers.length === 0) {
          toast.error('No valid columns found in the file');
          setIsLoadingFile(false);
          return;
        }
        
        setColumns(headers);
        
        // Store raw data for later parsing
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        setRawData(jsonData);
        
        // Auto-select columns if we can find likely matches
        const mpnLike = headers.find(h => 
          /mpn|sku|part.?number|product.?id|identifier/i.test(h)
        );
        const urlLike = headers.find(h => 
          /url|link|image|pdf|datasheet/i.test(h)
        );
        
        if (mpnLike) setIdentifierColumn(mpnLike);
        if (urlLike) setUrlColumn(urlLike);

        toast.success(`Loaded ${jsonData.length} rows from ${file.name}`);
        setIsLoadingFile(false);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse Excel file. Please check the file format.');
        setIsLoadingFile(false);
        clearFile();
      }
    };
    
    reader.onerror = () => {
      toast.error('Failed to read the file');
      setIsLoadingFile(false);
      clearFile();
    };
    
    reader.readAsArrayBuffer(file);
  }, []);

  const parseDataFromFile = useCallback(() => {
    if (!identifierColumn || !urlColumn) {
      toast.error('Please select both identifier and URL columns');
      return;
    }

    if (rawData.length === 0) {
      toast.error('No data available to parse. Please upload a file first.');
      return;
    }

    setIsParsing(true);
    
    // Use setTimeout to allow UI to update before parsing
    setTimeout(() => {
      try {
        const parsed: ParsedRow[] = [];
        let invalidUrlCount = 0;
        let emptyRowCount = 0;

        rawData.forEach((row, index) => {
          const identifier = String(row[identifierColumn] || '').trim();
          const url = String(row[urlColumn] || '').trim();
          
          if (!identifier || !url) {
            emptyRowCount++;
            return;
          }
          
          if (url.startsWith('http://') || url.startsWith('https://')) {
            parsed.push({ identifier, url, rowIndex: index + 2 });
          } else {
            invalidUrlCount++;
          }
        });

        setParsedData(parsed);
        
        if (parsed.length === 0) {
          if (invalidUrlCount > 0) {
            toast.error(`No valid URLs found. ${invalidUrlCount} URLs don't start with http:// or https://`);
          } else if (emptyRowCount > 0) {
            toast.error('No valid data found. Rows are missing identifier or URL values.');
          } else {
            toast.error('No valid URLs found in the selected column');
          }
        } else {
          let message = `Found ${parsed.length} valid URLs to download`;
          if (invalidUrlCount > 0) {
            message += ` (${invalidUrlCount} invalid URLs skipped)`;
          }
          toast.success(message);
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse file data');
      } finally {
        setIsParsing(false);
      }
    }, 100);
  }, [rawData, identifierColumn, urlColumn]);

  const clearFile = useCallback(() => {
    setFileName('');
    setParsedData([]);
    setColumns([]);
    setIdentifierColumn('');
    setUrlColumn('');
    setDownloadResults([]);
    setRawData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getFileExtension = (url: string, contentType?: string): string => {
    const urlPath = url.split('?')[0];
    const urlExt = urlPath.split('.').pop()?.toLowerCase();
    
    if (assetType === 'images') {
      if (urlExt && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(urlExt)) {
        return urlExt === 'jpeg' ? 'jpg' : urlExt;
      }
      if (contentType) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
        if (contentType.includes('png')) return 'png';
        if (contentType.includes('gif')) return 'gif';
        if (contentType.includes('webp')) return 'webp';
        if (contentType.includes('svg')) return 'svg';
      }
      return 'jpg';
    } else {
      if (urlExt === 'pdf') return 'pdf';
      if (contentType?.includes('pdf')) return 'pdf';
      return 'pdf';
    }
  };

  const sanitizeFilename = (name: string): string => {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  };

  type DownloadAssetSuccess = { blob: Blob; contentType: string; size?: number };
  type DownloadAssetFailure = { error: string };
  type DownloadAssetResponse = DownloadAssetSuccess | DownloadAssetFailure;

  const downloadAsset = async (url: string): Promise<DownloadAssetResponse> => {
    try {
      // Use backend function to avoid CORS issues
      const { data, error } = await supabase.functions.invoke('download-asset', {
        body: { url },
      });

      if (error) {
        console.error(`Downloader function error for ${url}:`, error);
        return { error: error.message || 'Downloader failed' };
      }

      if (data?.error) {
        console.error(`Download error for ${url}:`, data.error);
        return { error: String(data.error) };
      }

      if (!data?.data || !data?.contentType) {
        return { error: 'Invalid response from downloader' };
      }

      // Convert base64 back to blob
      let bytes: Uint8Array;
      try {
        const binaryString = atob(data.data);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } catch (e) {
        console.error('Failed to decode base64 response:', e);
        return { error: 'Failed to decode downloaded file' };
      }

      if (bytes.length === 0) {
        return { error: 'Downloaded file is empty' };
      }

      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: data.contentType });
      return { blob, contentType: data.contentType, size: data.size };
    } catch (error) {
      console.error(`Failed to download ${url}:`, error);
      return { error: error instanceof Error ? error.message : 'Failed to download' };
    }
  };

  const handleDownloadAssets = useCallback(async () => {
    if (parsedData.length === 0) {
      toast.error('No URLs to download. Please upload a file and select columns.');
      return;
    }

    setIsDownloading(true);
    setDownloadResults([]);
    
    const zip = new JSZip();
    const downloadedResults: DownloadResult[] = [];
    const totalAssets = parsedData.length;

    // Track used filenames to handle duplicates
    const usedFilenames = new Map<string, number>();

    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i];
      const sanitizedIdentifier = sanitizeFilename(item.identifier);
      
      setProgress({
        current: i + 1,
        total: totalAssets,
        currentFile: item.identifier,
      });

      const result = await downloadAsset(item.url);

      if ('error' in result) {
        downloadedResults.push({
          identifier: item.identifier,
          url: item.url,
          success: false,
          error: result.error,
        });
      } else {
        const ct = String(result.contentType || '').toLowerCase();
        const isHtml = ct.startsWith('text/html');
        const isOctet = ct.includes('application/octet-stream');
        const isImage = ct.startsWith('image/');
        const isPdf = ct.includes('pdf');

        const typeMismatch =
          assetType === 'images' ? !(isImage || isOctet) : !(isPdf || isOctet);

        if (isHtml || typeMismatch) {
          downloadedResults.push({
            identifier: item.identifier,
            url: item.url,
            success: false,
            error: `Unexpected file type: ${result.contentType}`,
          });
        } else {
          const ext = getFileExtension(item.url, result.contentType);

          // Handle duplicate identifiers by adding suffix
          let filename = `${sanitizedIdentifier}.${ext}`;
          const count = usedFilenames.get(sanitizedIdentifier) || 0;
          if (count > 0) {
            filename = `${sanitizedIdentifier}_${count + 1}.${ext}`;
          }
          usedFilenames.set(sanitizedIdentifier, count + 1);

          // Add file directly to root of ZIP (no folders)
          zip.file(filename, result.blob);

          downloadedResults.push({
            identifier: item.identifier,
            url: item.url,
            success: true,
          });
        }
      }

      setDownloadResults([...downloadedResults]);
    }

    // Generate and save ZIP
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().split('T')[0];
      const typeLabel = assetType === 'images' ? 'images' : 'pdfs';
      saveAs(content, `${typeLabel}_${timestamp}.zip`);
      
      const successCount = downloadedResults.filter(r => r.success).length;
      toast.success(`Downloaded ${successCount}/${totalAssets} ${assetType}`);
    } catch (error) {
      console.error('Failed to generate ZIP:', error);
      toast.error('Failed to create ZIP file');
    }

    setIsDownloading(false);
    setProgress(null);
  }, [parsedData, assetType]);

  const successCount = downloadResults.filter(r => r.success).length;
  const failedCount = downloadResults.filter(r => !r.success).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileArchive className="w-5 h-5 text-primary" />
          Asset Download
        </CardTitle>
        <CardDescription>
          Upload an Excel file with URLs to download images or PDFs as a ZIP file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Asset Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Asset Type</Label>
          <RadioGroup 
            value={assetType} 
            onValueChange={(v) => setAssetType(v as AssetType)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="images" id="images" />
              <Label htmlFor="images" className="flex items-center gap-2 cursor-pointer">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                Images
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdfs" id="pdfs" />
              <Label htmlFor="pdfs" className="flex items-center gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-red-400" />
                PDFs
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Excel File</Label>
          {isLoadingFile ? (
            <div className="border-2 border-dashed border-primary/50 rounded-lg p-6 text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Loading file...
              </p>
            </div>
          ) : !fileName ? (
            <div 
              className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload Excel file (.xlsx, .xls, .csv)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                File should contain identifier column (MPN/SKU) and URL column
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">{fileName}</span>
                {columns.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({rawData.length} rows, {columns.length} columns)
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile} disabled={isParsing || isDownloading}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Column Selection */}
        {columns.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Identifier Column (MPN/SKU)</Label>
              <Select value={identifierColumn} onValueChange={setIdentifierColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">URL Column</Label>
              <Select value={urlColumn} onValueChange={setUrlColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Parse Button */}
        {columns.length > 0 && identifierColumn && urlColumn && parsedData.length === 0 && (
          <Button 
            onClick={parseDataFromFile} 
            variant="outline" 
            className="w-full"
            disabled={isParsing}
          >
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Parsing URLs...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Parse URLs from File
              </>
            )}
          </Button>
        )}

        {/* Parsed Data Summary */}
        {parsedData.length > 0 && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              {assetType === 'images' ? (
                <ImageIcon className="w-4 h-4 text-blue-400" />
              ) : (
                <FileText className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{parsedData.length}</span> {assetType} URLs ready to download
              </span>
            </div>
          </div>
        )}

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
                    {r.identifier}: {r.url}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownloadAssets}
          disabled={isDownloading || parsedData.length === 0}
          variant="default"
          className="w-full"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Downloading {assetType}...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download {parsedData.length > 0 ? `${parsedData.length} ` : ''}{assetType === 'images' ? 'Images' : 'PDFs'} as ZIP
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Files will be organized in folders by identifier and named accordingly
        </p>
      </CardContent>
    </Card>
  );
}
