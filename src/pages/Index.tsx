import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { FileUpload } from '@/components/upload/FileUpload';
import { ProductTable } from '@/components/enrichment/ProductTable';
import { StatsBar } from '@/components/enrichment/StatsBar';
import { AttributePreview } from '@/components/enrichment/AttributePreview';
import { useEnrichmentJob } from '@/hooks/useEnrichmentJob';
import { TrainingModePanel } from '@/components/training/TrainingModePanel';
import { SavedTrainingsList } from '@/components/training/SavedTrainingsList';
import { BulkScrapePanel } from '@/components/training/BulkScrapePanel';
import { useTraining } from '@/hooks/useTraining';
import { ManufacturerTraining } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetDownloadPanel } from '@/components/training/AssetDownloadPanel';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Download, 
  RotateCcw, 
  Trash2,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Database,
  FileArchive,
  StopCircle,
  Loader2
} from 'lucide-react';

const Index = () => {
  const {
    products,
    attributes,
    stats,
    isEnriching,
    isComplete,
    isLoading,
    loadData,
    startEnrichment,
    cancelEnrichment,
    resetEnrichment,
    downloadResults,
    clearData,
    currentRun,
  } = useEnrichmentJob();

  const { trainings, fetchTrainings } = useTraining();
  const [activeTab, setActiveTab] = useState('enrichment');
  const [editingTraining, setEditingTraining] = useState<ManufacturerTraining | null>(null);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  const handleEditTraining = useCallback((training: ManufacturerTraining) => {
    setEditingTraining(training);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTraining(null);
  }, []);

  const handleTrainingComplete = useCallback(() => {
    setEditingTraining(null);
    fetchTrainings();
  }, [fetchTrainings]);

  const hasData = products.length > 0;
  const jobComplete = isComplete || (stats.pending === 0 && stats.processing === 0 && hasData);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Mobile: Scrollable tabs, Desktop: Grid */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex sm:grid sm:w-full sm:max-w-xl sm:grid-cols-4 sm:mx-auto min-w-max sm:min-w-0">
              <TabsTrigger value="enrichment" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">AI </span>Enrichment
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4">
                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                Training
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4">
                <Database className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Bulk </span>Scrape
              </TabsTrigger>
              <TabsTrigger value="download" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4">
                <FileArchive className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Asset </span>Download
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="enrichment">
            {!hasData ? (
              <div className="max-w-4xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-8 sm:mb-12 animate-fade-in">
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    <span className="text-xs sm:text-sm font-medium text-primary">AI-Powered Enrichment</span>
                  </div>
                  
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                    Product Data <span className="text-gradient">Enrichment</span>
                  </h1>
                  <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                    Transform your product catalog with intelligent attribute extraction. 
                    Upload your data, define attributes, and let AI do the rest.
                  </p>
                </div>
                
                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  {[
                    { icon: FileSpreadsheet, title: 'Multi-Sheet Input', desc: 'Products + attribute definitions' },
                    { icon: Sparkles, title: 'AI Intelligence', desc: 'Automated specification lookup' },
                    { icon: Download, title: 'Clean Export', desc: 'Excel-ready structured output' },
                  ].map((feature, i) => (
                    <div key={i} className="p-4 sm:p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                        <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base">{feature.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  ))}
                </div>

                {/* File Upload */}
                <FileUpload onFileProcessed={loadData} />
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">Enrichment Dashboard</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {products.length} products • {attributes.length} attribute mappings
                      {currentRun && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {currentRun.status === 'processing' ? 'Processing...' : currentRun.status}
                        </Badge>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {!jobComplete && !isEnriching && (
                      <Button
                        onClick={startEnrichment}
                        disabled={isLoading || stats.pending === 0}
                        variant="glow"
                        size="sm"
                        className="flex-1 sm:flex-none sm:size-lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Starting...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span className="hidden sm:inline">Start Enrichment</span>
                            <span className="sm:hidden">Start</span>
                            <ArrowRight className="w-4 h-4 hidden sm:block" />
                          </>
                        )}
                      </Button>
                    )}
                    
                    {isEnriching && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          className="flex-1 sm:flex-none"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs sm:text-sm">
                            {stats.success + stats.failed}/{stats.total}
                          </span>
                        </Button>
                        <Button
                          onClick={cancelEnrichment}
                          variant="outline"
                          size="sm"
                        >
                          <StopCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Cancel</span>
                        </Button>
                      </>
                    )}
                    
                    {jobComplete && (
                      <Button onClick={downloadResults} variant="success" size="sm" className="flex-1 sm:flex-none">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download Results</span>
                        <span className="sm:hidden">Download</span>
                      </Button>
                    )}
                    
                    <Button onClick={resetEnrichment} variant="outline" size="sm" disabled={isEnriching}>
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">Reset</span>
                    </Button>
                    
                    <Button onClick={clearData} variant="ghost" size="sm" disabled={isEnriching}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Stats */}
                <StatsBar stats={stats} />
                
                {/* Attribute Preview (collapsible) */}
                <details className="group" open>
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
                    View Attribute Mappings
                  </summary>
                  <AttributePreview attributes={attributes} />
                </details>
                
                {/* Product Table */}
                <ProductTable products={products} attributes={attributes} />
              </div>
            )}
          </TabsContent>

          {/* Training Mode Tab */}
          <TabsContent value="training">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Hero Section */}
              <div className="text-center mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Visual Selector Training</span>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Train <span className="text-gradient">Asset Scraping</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Teach the system how to extract images, datasheets, and specifications 
                  from manufacturer product pages. Training is reusable for bulk operations.
                </p>
              </div>

              {/* Training Panel */}
              <TrainingModePanel 
                onComplete={handleTrainingComplete} 
                editingTraining={editingTraining}
                onCancelEdit={handleCancelEdit}
              />

              {/* Saved Trainings */}
              <SavedTrainingsList onEdit={handleEditTraining} />
            </div>
          </TabsContent>

          {/* Bulk Scrape Tab */}
          <TabsContent value="bulk">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Hero Section */}
              <div className="text-center mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Bulk Asset Extraction</span>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Bulk <span className="text-gradient">Scraping Mode</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Use your trained extraction rules to scrape assets from multiple 
                  product URLs at once. Each asset maps to its own column.
                </p>
              </div>

              {/* Bulk Scrape Panel */}
              <BulkScrapePanel trainings={trainings} />

              {/* Saved Trainings Reference */}
              <SavedTrainingsList />
            </div>
          </TabsContent>

          {/* Asset Download Tab */}
          <TabsContent value="download">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Hero Section */}
              <div className="text-center mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <FileArchive className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Asset Download</span>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Bulk <span className="text-gradient">Asset Download</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Upload an Excel file containing image or PDF URLs. Select the asset type, 
                  map your columns, and download all files as an organized ZIP.
                </p>
              </div>

              {/* How it works */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                {[
                  { step: '1', title: 'Choose Type', desc: 'Select Images or PDFs' },
                  { step: '2', title: 'Upload File', desc: 'Excel with URLs & identifiers' },
                  { step: '3', title: 'Map Columns', desc: 'Select MPN & URL columns' },
                  { step: '4', title: 'Download ZIP', desc: 'Files renamed by identifier' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-card border border-border text-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-sm font-bold text-primary">{item.step}</span>
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Asset Download Panel */}
              <AssetDownloadPanel />
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>DataEnrich • Enterprise Product Specification Enrichment</p>
            <p>Powered by AI Intelligence</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
