import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

interface TrialLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrialLimitModal({ open, onOpenChange }: TrialLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Trial Limit Reached
          </DialogTitle>
          <DialogDescription className="text-center">
            You've used all 10 free requests. Create an account to continue using DataEnrichr.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              What you get with a free account:
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• 10 additional free credits upon signup</li>
              <li>• Access to all features</li>
              <li>• Save and manage your data</li>
              <li>• View usage history</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Link to="/auth" className="w-full">
              <Button className="w-full" variant="glow">
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/auth" className="w-full">
              <Button className="w-full" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Need more credits?{' '}
            <Link to="/pricing" className="text-primary hover:underline">
              View pricing plans
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
