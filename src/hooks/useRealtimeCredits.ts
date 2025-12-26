import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionData {
  creditsRemaining: number;
  creditsUsed: number;
}

export function useRealtimeCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<SubscriptionData | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      return;
    }

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('credits_remaining, credits_used')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!error && data) {
      setCredits({
        creditsRemaining: data.credits_remaining,
        creditsUsed: data.credits_used,
      });
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscription-credits')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const data = payload.new as any;
          setCredits({
            creditsRemaining: data.credits_remaining,
            creditsUsed: data.credits_used,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { credits, refreshCredits: fetchCredits };
}
