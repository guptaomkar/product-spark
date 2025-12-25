import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'trial' | 'basic' | 'pro' | 'enterprise';
  monthlyCredits: number;
  maxDevices: number;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

interface UserSubscription {
  id: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  creditsRemaining: number;
  creditsUsed: number;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodEnd: string;
  plan?: SubscriptionPlan;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;

      const formattedPlans: SubscriptionPlan[] = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        tier: plan.tier as SubscriptionPlan['tier'],
        monthlyCredits: plan.monthly_credits,
        maxDevices: plan.max_devices,
        priceMonthly: parseFloat(plan.price_monthly as unknown as string),
        priceYearly: parseFloat(plan.price_yearly as unknown as string),
        features: (plan.features as string[]) || []
      }));

      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const plan = data.subscription_plans as unknown as {
          id: string;
          name: string;
          tier: string;
          monthly_credits: number;
          max_devices: number;
          price_monthly: string;
          price_yearly: string;
          features: string[];
        };

        setSubscription({
          id: data.id,
          planId: data.plan_id,
          status: data.status as UserSubscription['status'],
          creditsRemaining: data.credits_remaining,
          creditsUsed: data.credits_used,
          billingCycle: data.billing_cycle as UserSubscription['billingCycle'],
          currentPeriodEnd: data.current_period_end,
          plan: plan ? {
            id: plan.id,
            name: plan.name,
            tier: plan.tier as SubscriptionPlan['tier'],
            monthlyCredits: plan.monthly_credits,
            maxDevices: plan.max_devices,
            priceMonthly: parseFloat(plan.price_monthly),
            priceYearly: parseFloat(plan.price_yearly),
            features: plan.features || []
          } : undefined
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const consumeCredit = useCallback(async (
    feature: string, 
    creditsToConsume: number = 1,
    requestData?: { mfr?: string; mpn?: string; category?: string }
  ): Promise<boolean> => {
    if (!user || !subscription) return false;
    if (subscription.creditsRemaining < creditsToConsume) return false;

    try {
      // Use atomic RPC function to prevent race conditions
      const { data, error } = await supabase.rpc('consume_credit', {
        p_user_id: user.id,
        p_feature: feature,
        p_credits_to_consume: creditsToConsume,
        p_request_data: requestData ? requestData : null
      });

      if (error) {
        console.error('Error consuming credit:', error);
        return false;
      }

      const result = data as { success: boolean; credits_remaining?: number; credits_used?: number; error?: string } | null;
      
      if (!result?.success) {
        console.error('Credit consumption failed:', result?.error);
        return false;
      }

      // Update local state with values from database
      setSubscription(prev => prev ? {
        ...prev,
        creditsRemaining: result.credits_remaining ?? prev.creditsRemaining - creditsToConsume,
        creditsUsed: result.credits_used ?? prev.creditsUsed + creditsToConsume
      } : null);

      return true;
    } catch (error) {
      console.error('Error consuming credit:', error);
      return false;
    }
  }, [user, subscription]);

  const hasCredits = subscription ? subscription.creditsRemaining > 0 : false;
  const isPaidPlan = subscription?.plan?.tier !== 'trial' && subscription?.plan?.tier !== undefined;

  return {
    subscription,
    plans,
    isLoading,
    hasCredits,
    isPaidPlan,
    consumeCredit,
    refreshSubscription: fetchSubscription
  };
}
