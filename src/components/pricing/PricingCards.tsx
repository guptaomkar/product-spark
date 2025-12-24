import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PricingCardsProps {
  billingCycle: 'monthly' | 'yearly';
}

export function PricingCards({ billingCycle }: PricingCardsProps) {
  const { user } = useAuth();
  const { plans, subscription } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planTier: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (planTier === 'trial') return;

    setLoadingPlan(planTier);

    try {
      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order
      const { data, error } = await supabase.functions.invoke('razorpay/create-order', {
        body: { planTier, billingCycle }
      });

      if (error) throw error;

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'DataEnrichr',
        description: `${planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan - ${billingCycle}`,
        handler: async (response: any) => {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke('razorpay/verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planTier,
                billingCycle
              }
            });

            if (verifyError) throw verifyError;

            toast.success('Payment successful! Your plan has been activated.');
            navigate('/dashboard');
          } catch (err) {
            console.error('Payment verification failed:', err);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#8B5CF6'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setLoadingPlan(null);
    }
  };

  const paidPlans = plans.filter(p => p.tier !== 'trial');

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {paidPlans.map((plan) => {
        const isCurrentPlan = subscription?.plan?.tier === plan.tier;
        const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
        const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(price / 12) : price;
        const isPopular = plan.tier === 'pro';

        return (
          <Card 
            key={plan.id} 
            className={`relative ${isPopular ? 'border-primary shadow-lg shadow-primary/20' : ''}`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Most Popular</Badge>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">₹{monthlyEquivalent}</span>
                <span className="text-muted-foreground">/month</span>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Billed ₹{price} yearly
                  </p>
                )}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                variant={isPopular ? 'glow' : 'default'}
                disabled={isCurrentPlan || loadingPlan !== null}
                onClick={() => handleSubscribe(plan.tier)}
              >
                {loadingPlan === plan.tier ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : (
                  'Subscribe'
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
