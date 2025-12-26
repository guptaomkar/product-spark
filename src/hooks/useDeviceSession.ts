import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function useDeviceSession(deviceFingerprint: string | null) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isRevoked, setIsRevoked] = useState(false);

  const checkDeviceStatus = useCallback(async () => {
    if (!user || !deviceFingerprint) return;

    const { data, error } = await supabase
      .from('user_devices')
      .select('is_active, revoked_at')
      .eq('user_id', user.id)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (error) {
      console.error('Error checking device status:', error);
      return;
    }

    // If device is not active or has been revoked
    if (data && (!data.is_active || data.revoked_at)) {
      setIsRevoked(true);
      toast.error('This device has been deactivated. You will be logged out.');
      
      // Sign out and redirect
      setTimeout(async () => {
        await signOut();
        navigate('/auth');
      }, 2000);
    }
  }, [user, deviceFingerprint, signOut, navigate]);

  // Check on mount
  useEffect(() => {
    checkDeviceStatus();
  }, [checkDeviceStatus]);

  // Subscribe to device changes
  useEffect(() => {
    if (!user || !deviceFingerprint) return;

    const channel = supabase
      .channel('device-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_devices',
        },
        (payload) => {
          const data = payload.new as any;
          // Check if this update is for our device
          if (data.device_fingerprint === deviceFingerprint && data.user_id === user.id) {
            if (!data.is_active || data.revoked_at) {
              setIsRevoked(true);
              toast.error('This device has been deactivated by an administrator.');
              
              setTimeout(async () => {
                await signOut();
                navigate('/auth');
              }, 2000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, deviceFingerprint, signOut, navigate]);

  return { isRevoked };
}
