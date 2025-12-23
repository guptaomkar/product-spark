import { Header } from '@/components/layout/Header';
import { 
  Target, 
  Users, 
  Zap, 
  Shield, 
  Globe, 
  Award,
  Building2,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">About Us</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Transforming <span className="text-gradient">Product Data</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We help businesses unlock the full potential of their product catalogs 
            through intelligent automation and AI-powered data enrichment.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-6">
                DataEnrich was founded with a simple goal: eliminate the manual effort 
                required to maintain accurate, complete product specifications. We believe 
                that every business deserves access to enterprise-grade data enrichment 
                without the enterprise price tag.
              </p>
              <p className="text-muted-foreground">
                Our platform leverages cutting-edge AI technology to automatically 
                discover, validate, and populate product attributes from trusted sources, 
                saving thousands of hours of manual research.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="text-4xl font-bold text-primary mb-2">10M+</div>
                <p className="text-sm text-muted-foreground">Products Enriched</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="text-4xl font-bold text-primary mb-2">500+</div>
                <p className="text-sm text-muted-foreground">Enterprise Clients</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="text-4xl font-bold text-primary mb-2">99.5%</div>
                <p className="text-sm text-muted-foreground">Data Accuracy</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <p className="text-sm text-muted-foreground">Support Available</p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">What We Do</h2>
          
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Product Data Enrichment
              </h3>
              <p className="text-sm text-muted-foreground">
                Automatically populate missing product attributes using AI-powered 
                lookups from manufacturer databases and trusted sources.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Asset Extraction
              </h3>
              <p className="text-sm text-muted-foreground">
                Scrape product images, datasheets, and technical documents from 
                manufacturer websites with intelligent selector training.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Bulk Processing
              </h3>
              <p className="text-sm text-muted-foreground">
                Process thousands of products simultaneously with parallel execution 
                and intelligent rate limiting for maximum efficiency.
              </p>
            </div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Who We Serve</h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Distributors</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage vast product catalogs from multiple manufacturers with 
                      consistent, accurate specifications across all SKUs.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Multi-manufacturer support
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Bulk catalog enrichment
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Manufacturers</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ensure your product data is complete and consistent across 
                      all sales channels and partner portals.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Channel syndication
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Data standardization
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">E-commerce Platforms</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Power your product search and filtering with rich, structured 
                      attribute data that improves discoverability.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Enhanced search filters
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Better product matching
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Data Teams</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Automate repetitive data entry tasks and focus on strategic 
                      initiatives that drive business value.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Time savings
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Quality assurance
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to Transform Your Product Data?
            </h2>
            <p className="text-muted-foreground mb-6">
              Get started with DataEnrich today and see the difference 
              AI-powered enrichment can make for your business.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/">
                <Button variant="glow" size="lg">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
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

export default About;
