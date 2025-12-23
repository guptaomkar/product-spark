import { Header } from '@/components/layout/Header';
import { 
  Database, 
  Sparkles, 
  FileSpreadsheet, 
  Download, 
  Cpu, 
  Globe, 
  ArrowRight,
  CheckCircle,
  Layers,
  Zap,
  Bot,
  FileSearch
} from 'lucide-react';

const Documentation = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <FileSearch className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Documentation</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How <span className="text-gradient">Data Enrichment</span> Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our platform uses multiple AI agents and specialized APIs to automatically 
            collect, validate, and enrich product attribute values from trusted sources.
          </p>
        </div>

        {/* Process Flow Diagram */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Enrichment Workflow
          </h2>
          
          <div className="relative max-w-4xl mx-auto">
            {/* Flow Steps */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { 
                  icon: FileSpreadsheet, 
                  title: 'Upload', 
                  desc: 'Upload Excel with Products & Attributes sheets',
                  step: 1 
                },
                { 
                  icon: Bot, 
                  title: 'AI Analysis', 
                  desc: 'AI agents parse and understand attribute requirements',
                  step: 2 
                },
                { 
                  icon: Globe, 
                  title: 'Data Collection', 
                  desc: 'Multi-source lookup from manufacturer sites & APIs',
                  step: 3 
                },
                { 
                  icon: Download, 
                  title: 'Export', 
                  desc: 'Download enriched data in structured Excel format',
                  step: 4 
                },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group">
                    <div className="absolute -top-3 left-6 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      Step {item.step}
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  
                  {i < 3 && (
                    <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-primary/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Agents Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Multi-Agent AI Architecture
          </h2>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Parser Agent</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Analyzes input data structure, validates formats, and prepares 
                product identifiers for lookup operations.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  MPN validation
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Category classification
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Manufacturer detection
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Lookup Agent</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Searches manufacturer databases, product catalogs, and 
                specification repositories for attribute values.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Multi-source search
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  API integrations
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Web scraping fallback
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Enrichment Agent</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Validates collected data, normalizes values, and assembles 
                the final enriched product records.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Value normalization
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Quality scoring
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Conflict resolution
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Pipeline Diagram */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Data Pipeline Architecture
          </h2>
          
          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-card border border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Input */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Input Layer</h4>
                <p className="text-xs text-muted-foreground">Excel/CSV Upload</p>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>• Products Sheet</p>
                  <p>• Attributes Sheet</p>
                </div>
              </div>

              <ArrowRight className="w-8 h-8 text-primary/30 rotate-90 md:rotate-0" />

              {/* Processing */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Processing Layer</h4>
                <p className="text-xs text-muted-foreground">AI Agent Orchestra</p>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>• Parallel Processing</p>
                  <p>• Multi-Agent Coordination</p>
                </div>
              </div>

              <ArrowRight className="w-8 h-8 text-primary/30 rotate-90 md:rotate-0" />

              {/* Data Sources */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Database className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Data Sources</h4>
                <p className="text-xs text-muted-foreground">External APIs & Sites</p>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>• Manufacturer Databases</p>
                  <p>• Product Catalogs</p>
                </div>
              </div>

              <ArrowRight className="w-8 h-8 text-primary/30 rotate-90 md:rotate-0" />

              {/* Output */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Output Layer</h4>
                <p className="text-xs text-muted-foreground">Enriched Export</p>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>• Structured Excel</p>
                  <p>• Quality Report</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enrichment Stages */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Enrichment Stages
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                stage: 'Validation',
                desc: 'Verify input data integrity, check MPN formats, and validate manufacturer names',
                status: 'Primary',
                color: 'bg-blue-500'
              },
              {
                stage: 'Classification',
                desc: 'Categorize products and map required attributes based on category definitions',
                status: 'Analysis',
                color: 'bg-purple-500'
              },
              {
                stage: 'Lookup',
                desc: 'Search multiple data sources in parallel to find attribute values',
                status: 'Collection',
                color: 'bg-orange-500'
              },
              {
                stage: 'Normalization',
                desc: 'Standardize values, convert units, and apply formatting rules',
                status: 'Processing',
                color: 'bg-yellow-500'
              },
              {
                stage: 'Assembly',
                desc: 'Combine all enriched attributes into final product records',
                status: 'Complete',
                color: 'bg-green-500'
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                <div className={`w-2 h-12 rounded-full ${item.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{item.stage}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <Zap className="w-5 h-5 text-primary/50" />
              </div>
            ))}
          </div>
        </section>

        {/* Input Requirements */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Input File Requirements
          </h2>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Products Sheet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Required columns for product identification:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-muted/30">
                  <code className="text-sm font-mono text-primary">MFR</code>
                  <span className="text-sm text-muted-foreground ml-2">- Manufacturer name</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <code className="text-sm font-mono text-primary">MPN</code>
                  <span className="text-sm text-muted-foreground ml-2">- Manufacturer Part Number</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <code className="text-sm font-mono text-primary">Category</code>
                  <span className="text-sm text-muted-foreground ml-2">- Product category</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Attributes Sheet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Define which attributes to enrich per category:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-muted/30">
                  <code className="text-sm font-mono text-primary">Category</code>
                  <span className="text-sm text-muted-foreground ml-2">- Category name</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <code className="text-sm font-mono text-primary">Attribute Name</code>
                  <span className="text-sm text-muted-foreground ml-2">- Attribute to enrich</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
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

export default Documentation;
