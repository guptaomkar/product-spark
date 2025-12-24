import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Laptop, Smartphone, Monitor, AlertTriangle } from 'lucide-react';
import { useDeviceTracking } from '@/hooks/useDeviceTracking';

interface DeviceLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceLimitModal({ open, onOpenChange }: DeviceLimitModalProps) {
  const navigate = useNavigate();
  const { devices, maxDevices, removeDevice } = useDeviceTracking();

  const getDeviceIcon = (os: string | null) => {
    if (!os) return <Monitor className="w-5 h-5" />;
    if (os.includes('Android') || os.includes('iOS')) {
      return <Smartphone className="w-5 h-5" />;
    }
    return <Laptop className="w-5 h-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle>Device Limit Reached</DialogTitle>
          </div>
          <DialogDescription>
            You've reached the maximum of {maxDevices} device{maxDevices > 1 ? 's' : ''} for your plan.
            Remove a device to use this one, or upgrade for more devices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <p className="text-sm font-medium text-muted-foreground">Active Devices:</p>
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
            >
              <div className="flex items-center gap-3">
                {getDeviceIcon(device.os)}
                <div>
                  <p className="text-sm font-medium">{device.deviceName || 'Unknown Device'}</p>
                  <p className="text-xs text-muted-foreground">
                    Last used: {new Date(device.lastUsedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeDevice(device.id)}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              navigate('/pricing');
            }}
          >
            Upgrade Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
