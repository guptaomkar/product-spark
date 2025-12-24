import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, AlertTriangle } from 'lucide-react';
import { useUsageTracking } from '@/hooks/useUsageTracking';

export function TrialBanner() {
  const { 
    isTrialMode, 
    remainingCredits, 
    trialLimitReached,
    isAuthenticated 
  } = useUsageTracking();

  if (isAuthenticated) return null;

  return (
    <div className={`border-b ${trialLimitReached ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/5 border-primary/20'}`}>
      <div className="container mx-auto px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {trialLimitReached ? (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          ) : (
            <Zap className="w-4 h-4 text-primary" />
          )}
          <span className={`text-sm font-medium ${trialLimitReached ? 'text-destructive' : 'text-primary'}`}>
            {trialLimitReached 
              ? 'Trial limit reached! Sign up to continue.'
              : `Trial Mode: ${remainingCredits} requests remaining`
            }
          </span>
        </div>
        <Link to="/auth">
          <Button size="sm" variant={trialLimitReached ? 'default' : 'outline'}>
            {trialLimitReached ? 'Sign Up Now' : 'Sign In'}
          </Button>
        </Link>
      </div>
    </div>
  );
}
