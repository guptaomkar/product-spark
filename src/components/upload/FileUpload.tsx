import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseExcelFile } from "@/lib/fileParser";
import { FileValidationResult } from "@/types/enrichment";

interface FileUploadProps {
  onFileProcessed: (result: FileValidationResult) => void;
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setValidationResult({
        isValid: false,
        errors: ["Please upload a valid Excel file (.xlsx or .xls)"],
        products: [],
        attributes: [],
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const result = await parseExcelFile(file);
      setValidationResult(result);
      if (result.isValid) {
        onFileProcessed(result);
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        errors: [error instanceof Error ? error.message : "Failed to process file"],
        products: [],
        attributes: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center
          transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-card/50"
          }
          ${isProcessing ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`
            w-16 h-16 rounded-2xl flex items-center justify-center
            transition-all duration-300
            ${isDragging ? "bg-primary/20 scale-110" : "bg-secondary"}
          `}
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className={`w-8 h-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-foreground">
              {isProcessing ? "Processing file..." : "Drop your Excel file here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Supports .xlsx and .xls files</span>
          </div>
        </div>
      </div>

      {validationResult && (
        <div
          className={`
          mt-6 p-4 rounded-lg border animate-slide-up
          ${validationResult.isValid ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}
        `}
        >
          <div className="flex items-start gap-3">
            {validationResult.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            )}

            <div className="flex-1">
              <p className={`font-medium ${validationResult.isValid ? "text-success" : "text-destructive"}`}>
                {validationResult.isValid ? "File validated successfully!" : "Validation errors found"}
              </p>

              {validationResult.isValid ? (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>• {validationResult.products.length} products found</p>
                  <p>• {validationResult.attributes.length} attribute mappings found</p>
                  <p>• {[...new Set(validationResult.attributes.map((a) => a.category))].length} categories defined</p>
                </div>
              ) : (
                <ul className="mt-2 text-sm text-destructive/80 space-y-1">
                  {validationResult.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                  {validationResult.errors.length > 5 && (
                    <li>• ... and {validationResult.errors.length - 5} more errors</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 rounded-lg bg-card/50 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Required File Structure</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-primary mb-2">Sheet 1: Product Master</p>
            <div className="font-mono text-xs bg-muted/50 rounded p-3 text-muted-foreground">
              <p>Manufacturer name | Manufacturer Part Number | Category</p>
              <p className="text-muted-foreground/60 mt-1">Acme | ABC-123 | Electronics</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-primary mb-2">Sheet 2: Attribute Definition</p>
            <div className="font-mono text-xs bg-muted/50 rounded p-3 text-muted-foreground">
              <p>Category | Attribute Name</p>
              <p className="text-muted-foreground/60 mt-1">Electronics | Voltage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
