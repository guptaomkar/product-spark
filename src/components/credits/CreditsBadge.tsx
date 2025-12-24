import { Link } from 'react-router-dom';
import { Zap, Crown } from 'lucide-react';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useSubscription } from '@/hooks/useSubscription';

export function CreditsBadge() {
  const { remainingCredits, isTrialMode, isAuthenticated } = useUsageTracking();
  const { subscription } = useSubscription();

  const planName = subscription?.plan?.name || 'Trial';
  const isPro = subscription?.plan?.tier === 'pro' || subscription?.plan?.tier === 'enterprise';

  return (
    <Link 
      to={isAuthenticated ? '/dashboard' : '/auth'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
    >
      {isPro ? (
        <Crown className="w-4 h-4 text-primary" />
      ) : (
        <Zap className="w-4 h-4 text-primary" />
      )}
      <span className="text-sm font-medium text-primary">
        {isTrialMode 
          ? `Trial: ${remainingCredits} left`
          : `${remainingCredits} credits`
        }
      </span>
      {!isTrialMode && (
        <span className="text-xs text-muted-foreground">
          {planName}
        </span>
      )}
    </Link>
  );
}
