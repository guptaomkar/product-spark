import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrialUsageContext } from '@/contexts/TrialUsageContext';
import { useSubscription } from './useSubscription';

interface RequestData {
  mfr?: string;
  mpn?: string;
  category?: string;
}

interface UseUsageTrackingResult {
  canMakeRequest: boolean;
  remainingCredits: number;
  isTrialMode: boolean;
  isAuthenticated: boolean;
  trialLimitReached: boolean;
  consumeCredit: (feature: string, requestData?: RequestData) => Promise<boolean>;
  showUpgradePrompt: boolean;
  refreshCredits: () => Promise<void>;
}

export function useUsageTracking(): UseUsageTrackingResult {
  const { user } = useAuth();
  const { trialUsage, consumeTrialCredit, refreshTrialUsage } = useTrialUsageContext();
  const { subscription, consumeCredit: consumeSubscriptionCredit, hasCredits, refreshSubscription } = useSubscription();

  const isAuthenticated = !!user;
  const isTrialMode = !isAuthenticated;
  const trialLimitReached = trialUsage.isLimitReached;

  const remainingCredits = isAuthenticated 
    ? (subscription?.creditsRemaining || 0)
    : trialUsage.remaining;

  const canMakeRequest = isAuthenticated 
    ? hasCredits 
    : !trialLimitReached;

  const showUpgradePrompt = isTrialMode && trialLimitReached;

  const consumeCredit = useCallback(async (feature: string, requestData?: RequestData): Promise<boolean> => {
    if (isAuthenticated) {
      return consumeSubscriptionCredit(feature, 1, requestData);
    } else {
      return consumeTrialCredit(feature);
    }
  }, [isAuthenticated, consumeSubscriptionCredit, consumeTrialCredit]);

  const refreshCredits = useCallback(async () => {
    if (isAuthenticated) {
      await refreshSubscription();
    } else {
      await refreshTrialUsage();
    }
  }, [isAuthenticated, refreshSubscription, refreshTrialUsage]);

  return {
    canMakeRequest,
    remainingCredits,
    isTrialMode,
    isAuthenticated,
    trialLimitReached,
    consumeCredit,
    showUpgradePrompt,
    refreshCredits
  };
}
