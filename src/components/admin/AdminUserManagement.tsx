import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Minus } from 'lucide-react';

interface CreditManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentCredits: number;
  onSuccess: () => void;
}

export function CreditManagementDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentCredits,
  onSuccess,
}: CreditManagementDialogProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<'add' | 'deduct'>('add');

  const handleSubmit = async () => {
    const creditAmount = parseInt(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (action === 'deduct' && creditAmount > currentCredits) {
      toast.error('Cannot deduct more than available credits');
      return;
    }

    setIsLoading(true);
    try {
      const newCredits = action === 'add' 
        ? currentCredits + creditAmount 
        : currentCredits - creditAmount;

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ credits_remaining: newCredits })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Successfully ${action === 'add' ? 'added' : 'deducted'} ${creditAmount} credits`);
      setAmount('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating credits:', error);
      toast.error('Failed to update credits');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Credits</DialogTitle>
          <DialogDescription>
            {action === 'add' ? 'Add' : 'Deduct'} credits for {userEmail}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Button
              variant={action === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('add')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button
              variant={action === 'deduct' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('deduct')}
            >
              <Minus className="w-4 h-4 mr-1" />
              Deduct
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Current credits: <span className="font-medium text-foreground">{currentCredits}</span>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter credit amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
          </div>
          
          {amount && !isNaN(parseInt(amount)) && (
            <div className="text-sm text-muted-foreground">
              New balance: <span className="font-medium text-foreground">
                {action === 'add' 
                  ? currentCredits + parseInt(amount) 
                  : currentCredits - parseInt(amount)}
              </span>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {action === 'add' ? 'Add Credits' : 'Deduct Credits'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeviceManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentMaxDevices: number;
  onSuccess: () => void;
}

export function DeviceManagementDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentMaxDevices,
  onSuccess,
}: DeviceManagementDialogProps) {
  const [maxDevices, setMaxDevices] = useState(currentMaxDevices.toString());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const devices = parseInt(maxDevices);
    if (isNaN(devices) || devices < 1) {
      toast.error('Please enter a valid number (minimum 1)');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ max_devices: devices })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Successfully updated max devices to ${devices}`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating max devices:', error);
      toast.error('Failed to update device limit');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Device Limit</DialogTitle>
          <DialogDescription>
            Set max devices for {userEmail}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Current limit: <span className="font-medium text-foreground">{currentMaxDevices} devices</span>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maxDevices">Max Devices Allowed</Label>
            <Input
              id="maxDevices"
              type="number"
              placeholder="Enter max devices"
              value={maxDevices}
              onChange={(e) => setMaxDevices(e.target.value)}
              min="1"
              max="100"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Limit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
