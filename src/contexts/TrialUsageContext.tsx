import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrialUsage {
  requestsUsed: number;
  maxRequests: number;
  remaining: number;
  isLimitReached: boolean;
}

interface TrialUsageContextType {
  trialUsage: TrialUsage;
  isLoading: boolean;
  consumeTrialCredit: (feature: string) => Promise<boolean>;
  refreshTrialUsage: () => Promise<void>;
}

const TrialUsageContext = createContext<TrialUsageContextType | undefined>(undefined);

export function TrialUsageProvider({ children }: { children: ReactNode }) {
  const [trialUsage, setTrialUsage] = useState<TrialUsage>({
    requestsUsed: 0,
    maxRequests: 10,
    remaining: 10,
    isLimitReached: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [ipAddress, setIpAddress] = useState<string | null>(null);

  const fetchIpAddress = useCallback(async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setIpAddress(data.ip);
      return data.ip;
    } catch (error) {
      console.error('Error fetching IP:', error);
      const fallbackId = localStorage.getItem('trial_id') || crypto.randomUUID();
      localStorage.setItem('trial_id', fallbackId);
      setIpAddress(fallbackId);
      return fallbackId;
    }
  }, []);

  const fetchTrialUsage = useCallback(async (ip: string) => {
    try {
      const { data, error } = await supabase
        .from('trial_usage')
        .select('*')
        .eq('ip_address', ip)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const usage: TrialUsage = {
          requestsUsed: data.requests_used,
          maxRequests: data.max_requests,
          remaining: Math.max(0, data.max_requests - data.requests_used),
          isLimitReached: data.requests_used >= data.max_requests
        };
        setTrialUsage(usage);
      } else {
        setTrialUsage({
          requestsUsed: 0,
          maxRequests: 10,
          remaining: 10,
          isLimitReached: false
        });
      }
    } catch (error) {
      console.error('Error fetching trial usage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const ip = await fetchIpAddress();
      if (ip) {
        await fetchTrialUsage(ip);
      }
    };
    init();
  }, [fetchIpAddress, fetchTrialUsage]);

  const consumeTrialCredit = useCallback(async (feature: string): Promise<boolean> => {
    if (!ipAddress) return false;
    if (trialUsage.isLimitReached) return false;

    try {
      const { data: existing } = await supabase
        .from('trial_usage')
        .select('*')
        .eq('ip_address', ipAddress)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('trial_usage')
          .update({
            requests_used: existing.requests_used + 1,
            last_request_at: new Date().toISOString()
          })
          .eq('ip_address', ipAddress);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trial_usage')
          .insert({
            ip_address: ipAddress,
            requests_used: 1,
            max_requests: 10
          });

        if (error) throw error;
      }

      // Immediately update local state for instant UI feedback
      setTrialUsage(prev => {
        const newUsed = prev.requestsUsed + 1;
        return {
          ...prev,
          requestsUsed: newUsed,
          remaining: Math.max(0, prev.maxRequests - newUsed),
          isLimitReached: newUsed >= prev.maxRequests
        };
      });

      return true;
    } catch (error) {
      console.error('Error consuming trial credit:', error);
      return false;
    }
  }, [ipAddress, trialUsage.isLimitReached]);

  const refreshTrialUsage = useCallback(async () => {
    if (ipAddress) {
      await fetchTrialUsage(ipAddress);
    }
  }, [ipAddress, fetchTrialUsage]);

  return (
    <TrialUsageContext.Provider value={{ trialUsage, isLoading, consumeTrialCredit, refreshTrialUsage }}>
      {children}
    </TrialUsageContext.Provider>
  );
}

export function useTrialUsageContext() {
  const context = useContext(TrialUsageContext);
  if (!context) {
    throw new Error('useTrialUsageContext must be used within TrialUsageProvider');
  }
  return context;
}
