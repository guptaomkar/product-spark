import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DeviceInfo {
  fingerprint: string;
  browser: string;
  os: string;
  deviceName: string;
}

interface UserDevice {
  id: string;
  deviceFingerprint: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  isActive: boolean;
}

export function useDeviceTracking() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [maxDevices, setMaxDevices] = useState(1);
  const [isDeviceLimitReached, setIsDeviceLimitReached] = useState(false);
  const [isCurrentDeviceAllowed, setIsCurrentDeviceAllowed] = useState(true);

  // Generate device fingerprint
  const generateFingerprint = useCallback((): DeviceInfo => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 10);
    const canvasData = canvas.toDataURL();

    const screenData = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;

    // Create a hash-like fingerprint
    const rawFingerprint = `${canvasData}-${screenData}-${timezone}-${language}-${platform}-${userAgent}`;
    const fingerprint = btoa(rawFingerprint).substring(0, 64);

    // Parse browser and OS from user agent
    let browser = 'Unknown';
    let os = 'Unknown';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';

    const deviceName = `${browser} on ${os}`;

    return { fingerprint, browser, os, deviceName };
  }, []);

  // Fetch user's devices
  const fetchDevices = useCallback(async () => {
    if (!user) {
      setDevices([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      const formattedDevices: UserDevice[] = (data || []).map(d => ({
        id: d.id,
        deviceFingerprint: d.device_fingerprint,
        deviceName: d.device_name,
        browser: d.browser,
        os: d.os,
        ipAddress: d.ip_address,
        lastUsedAt: d.last_used_at,
        isActive: d.is_active
      }));

      setDevices(formattedDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Get max devices from subscription
  const fetchMaxDevices = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('subscription_plans(max_devices)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const plan = data?.subscription_plans as unknown as { max_devices: number } | null;
      if (plan) {
        setMaxDevices(plan.max_devices);
      }
    } catch (error) {
      console.error('Error fetching max devices:', error);
    }
  }, [user]);

  // Register or update current device
  const registerDevice = useCallback(async (deviceInfo: DeviceInfo): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if device already exists
      const { data: existingDevice, error: checkError } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceInfo.fingerprint)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingDevice) {
        // Update last used time
        await supabase
          .from('user_devices')
          .update({ 
            last_used_at: new Date().toISOString(),
            is_active: true
          })
          .eq('id', existingDevice.id);
        
        return true;
      }

      // Check if we can add a new device
      const { data: activeDevices, error: countError } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (countError) throw countError;

      const activeCount = activeDevices?.length || 0;

      if (activeCount >= maxDevices) {
        setIsDeviceLimitReached(true);
        setIsCurrentDeviceAllowed(false);
        return false;
      }

      // Fetch IP address
      let ipAddress = null;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch {
        console.error('Could not fetch IP address');
      }

      // Register new device
      const { error: insertError } = await supabase
        .from('user_devices')
        .insert({
          user_id: user.id,
          device_fingerprint: deviceInfo.fingerprint,
          device_name: deviceInfo.deviceName,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ip_address: ipAddress,
          is_active: true
        });

      if (insertError) throw insertError;

      await fetchDevices();
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }, [user, maxDevices, fetchDevices]);

  // Remove a device
  const removeDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false })
        .eq('id', deviceId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchDevices();
      toast.success('Device removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
      return false;
    }
  }, [user, fetchDevices]);

  // Initialize on mount
  useEffect(() => {
    if (user) {
      const deviceInfo = generateFingerprint();
      setCurrentDevice(deviceInfo);
      fetchDevices();
      fetchMaxDevices();
    }
  }, [user, generateFingerprint, fetchDevices, fetchMaxDevices]);

  // Register device when we have all info
  useEffect(() => {
    if (user && currentDevice && !isLoading) {
      registerDevice(currentDevice);
    }
  }, [user, currentDevice, isLoading, registerDevice]);

  // Check if device limit is reached
  useEffect(() => {
    if (devices.length >= maxDevices) {
      setIsDeviceLimitReached(true);
      
      // Check if current device is in the list
      if (currentDevice) {
        const isAllowed = devices.some(d => d.deviceFingerprint === currentDevice.fingerprint);
        setIsCurrentDeviceAllowed(isAllowed);
      }
    } else {
      setIsDeviceLimitReached(false);
      setIsCurrentDeviceAllowed(true);
    }
  }, [devices, maxDevices, currentDevice]);

  return {
    devices,
    currentDevice,
    isLoading,
    maxDevices,
    isDeviceLimitReached,
    isCurrentDeviceAllowed,
    removeDevice,
    refreshDevices: fetchDevices
  };
}
