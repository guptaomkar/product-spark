import { Header } from '@/components/layout/Header';
import { 
  Check, 
  Sparkles, 
  Zap,
  ArrowRight,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

const Pricing = () => {
  const { plans, isLoading } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter out trial plans for public display
  const paidPlans = plans.filter(p => p.tier !== 'trial');

  const handleGetStarted = (planTier: string) => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">Pricing</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4 px-2">
            Simple, <span className="text-gradient">Transparent</span> Pricing
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Choose the plan that fits your catalog size. No hidden fees, 
            no surprises. Scale as you grow.
          </p>
        </div>

        {/* Pricing Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className={`max-w-6xl mx-auto grid gap-4 sm:gap-6 mb-12 sm:mb-16 ${
            paidPlans.length === 1 ? 'grid-cols-1 max-w-md' :
            paidPlans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' :
            paidPlans.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {paidPlans.map((plan) => {
              const isPopular = plan.tier === 'pro';
              
              return (
                <div 
                  key={plan.id}
                  className={`relative p-5 sm:p-6 rounded-2xl border ${
                    isPopular 
                      ? 'bg-gradient-to-b from-primary/10 to-card border-primary/30 ring-2 ring-primary/20' 
                      : 'bg-card border-border'
                  } flex flex-col`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                    {plan.subtitle && (
                      <p className="text-xs sm:text-sm text-muted-foreground">{plan.subtitle}</p>
                    )}
                  </div>
                  
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground">${plan.priceMonthly.toLocaleString()}</span>
                    </div>
                    {plan.credits_display_text && (
                      <div className="mt-2">
                        <span className="text-xs sm:text-sm font-medium text-primary">{plan.credits_display_text}</span>
                      </div>
                    )}
                    {plan.per_mpn_cost && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {plan.per_mpn_cost}
                      </p>
                    )}
                  </div>

                  {plan.main_feature_text && (
                    <p className="text-xs sm:text-sm font-semibold text-primary mb-3 sm:mb-4">
                      {plan.main_feature_text}
                    </p>
                  )}
                  
                  <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-1">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={isPopular ? 'glow' : 'outline'} 
                    className="w-full text-sm"
                    size="sm"
                    onClick={() => handleGetStarted(plan.tier)}
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Usage Info */}
        <section className="max-w-4xl mx-auto mb-12 sm:mb-16">
          <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  Usage Transparency
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Each MPN (Manufacturer Part Number) counts as one enrichment credit, 
                  regardless of how many attributes are enriched. You can track your 
                  usage in real-time through your dashboard.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                    <p className="text-xs sm:text-sm font-medium text-foreground">Credits Don't Expire</p>
                    <p className="text-xs text-muted-foreground">Use at your own pace</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                    <p className="text-xs sm:text-sm font-medium text-foreground">Real-time Tracking</p>
                    <p className="text-xs text-muted-foreground">Monitor usage live</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                    <p className="text-xs sm:text-sm font-medium text-foreground">Easy Upgrades</p>
                    <p className="text-xs text-muted-foreground">Scale anytime</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3 sm:space-y-4">
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
                q: 'What if I need more MPNs?',
                a: 'Contact our sales team for custom enterprise pricing. We offer volume discounts for large-scale enrichment projects.'
              },
              {
                q: 'Is there a free trial?',
                a: 'We offer a limited free tier for testing. Contact us to get access and evaluate the platform with your actual data.'
              },
            ].map((faq, i) => (
              <div key={i} className="p-3 sm:p-4 rounded-xl bg-card border border-border">
                <div className="flex items-start gap-2 sm:gap-3">
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">{faq.q}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mt-12 sm:mt-16">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">
              Not sure which plan is right for you?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              Let us help you find the perfect fit for your data enrichment needs.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <Link to="/">
                <Button variant="glow" size="sm" className="w-full sm:w-auto sm:size-lg">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="w-full sm:w-auto sm:size-lg">
                Contact Sales
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-border mt-12 sm:mt-16">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            <p>DataEnrich • Enterprise Product Specification Enrichment</p>
            <p>Powered by AI Intelligence</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
