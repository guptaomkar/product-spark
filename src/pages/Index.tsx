import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { FileUpload } from '@/components/upload/FileUpload';
import { ProductTable } from '@/components/enrichment/ProductTable';
import { StatsBar } from '@/components/enrichment/StatsBar';
import { AttributePreview } from '@/components/enrichment/AttributePreview';
import { useEnrichment } from '@/hooks/useEnrichment';
import { TrainingModePanel } from '@/components/training/TrainingModePanel';
import { SavedTrainingsList } from '@/components/training/SavedTrainingsList';
import { BulkScrapePanel } from '@/components/training/BulkScrapePanel';
import { useTraining } from '@/hooks/useTraining';
import { ManufacturerTraining } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Download, 
  RotateCcw, 
  Trash2,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Database
} from 'lucide-react';

const Index = () => {
  const {
    products,
    attributes,
    stats,
    isEnriching,
    loadData,
    startEnrichment,
    resetEnrichment,
    downloadResults,
    clearData,
  } = useEnrichment();

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
  const isComplete = stats.pending === 0 && stats.processing === 0 && hasData;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
            <TabsTrigger value="enrichment" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Enrichment
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Bulk Scrape
            </TabsTrigger>
          </TabsList>

          {/* AI Enrichment Tab */}
          <TabsContent value="enrichment">
            {!hasData ? (
              <div className="max-w-4xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-12 animate-fade-in">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI-Powered Enrichment</span>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                    Product Data <span className="text-gradient">Enrichment</span>
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Transform your product catalog with intelligent attribute extraction. 
                    Upload your data, define attributes, and let AI do the rest.
                  </p>
                </div>
                
                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  {[
                    { icon: FileSpreadsheet, title: 'Multi-Sheet Input', desc: 'Products + attribute definitions' },
                    { icon: Sparkles, title: 'AI Intelligence', desc: 'Automated specification lookup' },
                    { icon: Download, title: 'Clean Export', desc: 'Excel-ready structured output' },
                  ].map((feature, i) => (
                    <div key={i} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Downloads CTA */}
                <div className="flex items-center justify-center mb-10 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                  <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
                    <p className="text-sm text-muted-foreground">
                      Need to download images/PDFs by MPN? Use <span className="text-foreground font-medium">Bulk Scrape</span>.
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab('bulk')}>
                      <Download className="w-4 h-4" />
                      Open Bulk Scrape
                    </Button>
                  </div>
                </div>

                {/* File Upload */}
                <FileUpload onFileProcessed={loadData} />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Enrichment Dashboard</h2>
                    <p className="text-sm text-muted-foreground">
                      {products.length} products • {attributes.length} attribute mappings
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isComplete && (
                      <Button
                        onClick={startEnrichment}
                        disabled={isEnriching || stats.pending === 0}
                        variant={isEnriching ? 'secondary' : 'glow'}
                        size="lg"
                      >
                        {isEnriching ? (
                          <>
                            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Start Enrichment
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    )}
                    
                    {isComplete && (
                      <Button onClick={downloadResults} variant="success" size="lg">
                        <Download className="w-4 h-4" />
                        Download Results
                      </Button>
                    )}
                    
                    <Button onClick={resetEnrichment} variant="outline" disabled={isEnriching}>
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                    
                    <Button onClick={clearData} variant="ghost" disabled={isEnriching}>
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

              {/* Standalone Asset Download Info Card */}
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Download className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Asset Download Feature</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Run a bulk scrape and the <strong>Asset Download</strong> panel will appear under the results. It
                      detects image/PDF URLs from extracted data, renames files using the MPN column, and packages
                      everything into a ZIP organized by product.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Auto-detects downloadable URLs (images, PDFs)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Renames files using MPN for easy identification
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Creates an organized ZIP with folders per product
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Handles broken/missing URLs gracefully
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bulk Scrape Panel with Asset Download */}
              <BulkScrapePanel trainings={trainings} />

              {/* Saved Trainings Reference */}
              <SavedTrainingsList />
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
