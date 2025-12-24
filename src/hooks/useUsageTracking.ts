import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrialUsage } from './useTrialUsage';
import { useSubscription } from './useSubscription';

interface UseUsageTrackingResult {
  canMakeRequest: boolean;
  remainingCredits: number;
  isTrialMode: boolean;
  isAuthenticated: boolean;
  trialLimitReached: boolean;
  consumeCredit: (feature: string) => Promise<boolean>;
  showUpgradePrompt: boolean;
}

export function useUsageTracking(): UseUsageTrackingResult {
  const { user } = useAuth();
  const { trialUsage, consumeTrialCredit } = useTrialUsage();
  const { subscription, consumeCredit: consumeSubscriptionCredit, hasCredits } = useSubscription();

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

  const consumeCredit = useCallback(async (feature: string): Promise<boolean> => {
    if (isAuthenticated) {
      return consumeSubscriptionCredit(feature);
    } else {
      return consumeTrialCredit(feature);
    }
  }, [isAuthenticated, consumeSubscriptionCredit, consumeTrialCredit]);

  return {
    canMakeRequest,
    remainingCredits,
    isTrialMode,
    isAuthenticated,
    trialLimitReached,
    consumeCredit,
    showUpgradePrompt
  };
}
