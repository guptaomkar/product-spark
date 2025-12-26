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

  // Poll credits periodically (avoids Realtime WebSocket dependency)
  useEffect(() => {
    if (!user) return;

    fetchCredits();

    const interval = window.setInterval(() => {
      fetchCredits();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user, fetchCredits]);

  return { credits, refreshCredits: fetchCredits };
}
