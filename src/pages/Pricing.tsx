import { Header } from '@/components/layout/Header';
import { 
  Check, 
  Sparkles, 
  Zap,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Pricing = () => {
  const plans = [
    {
      name: 'Starter',
      price: 99,
      mpn: '1,400',
      perMpn: '0.071',
      description: 'Perfect for small catalogs and testing',
      features: [
        'Up to 1,400 MPN enrichments',
        'AI-powered attribute lookup',
        'Excel export',
        'Email support',
        '7-day data retention',
      ],
      popular: false,
    },
    {
      name: 'Professional',
      price: 500,
      mpn: '7,100',
      perMpn: '0.070',
      description: 'Best for growing businesses',
      features: [
        'Up to 7,100 MPN enrichments',
        'All Starter features',
        'Asset extraction (images & PDFs)',
        'Bulk processing',
        'Priority support',
        '30-day data retention',
      ],
      popular: true,
    },
    {
      name: 'Business',
      price: 1000,
      mpn: '14,000',
      perMpn: '0.071',
      description: 'For established enterprises',
      features: [
        'Up to 14,000 MPN enrichments',
        'All Professional features',
        'Custom selector training',
        'API access',
        'Dedicated support',
        '90-day data retention',
      ],
      popular: false,
    },
    {
      name: 'Enterprise',
      price: 5000,
      mpn: '71,400',
      perMpn: '0.070',
      description: 'Unlimited scale and support',
      features: [
        'Up to 71,400 MPN enrichments',
        'All Business features',
        'White-glove onboarding',
        'Custom integrations',
        'SLA guarantee',
        'Unlimited data retention',
        'Dedicated account manager',
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Pricing</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple, <span className="text-gradient">Transparent</span> Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your catalog size. No hidden fees, 
            no surprises. Scale as you grow.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, i) => (
            <div 
              key={i}
              className={`relative p-6 rounded-2xl border ${
                plan.popular 
                  ? 'bg-gradient-to-b from-primary/10 to-card border-primary/30 ring-2 ring-primary/20' 
                  : 'bg-card border-border'
              } flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">{plan.mpn} MPN</span>
                  <span className="text-xs text-muted-foreground">included</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ~${plan.perMpn} per MPN
                </p>
              </div>
              
              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                variant={plan.popular ? 'glow' : 'outline'} 
                className="w-full"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Usage Info */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Usage Transparency
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Each MPN (Manufacturer Part Number) counts as one enrichment credit, 
                  regardless of how many attributes are enriched. You can track your 
                  usage in real-time through your dashboard.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium text-foreground">Credits Don't Expire</p>
                    <p className="text-xs text-muted-foreground">Use at your own pace</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium text-foreground">Real-time Tracking</p>
                    <p className="text-xs text-muted-foreground">Monitor usage live</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium text-foreground">Easy Upgrades</p>
                    <p className="text-xs text-muted-foreground">Scale anytime</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            {[
              {
                q: 'What counts as one MPN credit?',
                a: 'Each unique Manufacturer Part Number (MPN) that gets enriched counts as one credit, regardless of how many attributes are filled in for that product.'
              },
              {
                q: 'Can I upgrade my plan mid-cycle?',
                a: 'Yes! You can upgrade at any time. Your remaining credits will carry over and combine with your new plan allocation.'
              },
              {
                q: 'Do unused credits roll over?',
                a: 'Credits remain valid as long as your account is active. There is no monthly expiration on purchased credits.'
              },
              {
                q: 'What if I need more than 71,400 MPNs?',
                a: 'Contact our sales team for custom enterprise pricing. We offer volume discounts for large-scale enrichment projects.'
              },
              {
                q: 'Is there a free trial?',
                a: 'We offer a limited free tier for testing. Contact us to get access and evaluate the platform with your actual data.'
              },
            ].map((faq, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground mb-1">{faq.q}</h4>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mt-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Not sure which plan is right for you?
            </h2>
            <p className="text-muted-foreground mb-6">
              Let us help you find the perfect fit for your data enrichment needs.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/">
                <Button variant="glow" size="lg">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                Contact Sales
              </Button>
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

export default Pricing;
