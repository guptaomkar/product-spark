import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useDeviceTracking } from '@/hooks/useDeviceTracking';
import { useRealtimeCredits } from '@/hooks/useRealtimeCredits';
import { useDeviceSession } from '@/hooks/useDeviceSession';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  LayoutDashboard, 
  CreditCard, 
  History, 
  Download, 
  Zap, 
  Crown,
  Calendar,
  TrendingUp,
  Loader2,
  Settings,
  Smartphone,
  Trash2,
  Filter
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface UsageLog {
  id: string;
  feature: string;
  credits_used: number;
  created_at: string;
  request_data: {
    mfr?: string;
    mpn?: string;
    category?: string;
  } | null;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { subscription, plans, isLoading: subLoading } = useSubscription();
  const { devices, maxDevices, isLoading: devicesLoading, removeDevice, currentDevice } = useDeviceTracking();
  const { credits } = useRealtimeCredits();
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<UsageLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const navigate = useNavigate();

  // Monitor device session for revocation
  useDeviceSession(currentDevice?.fingerprint || null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchUsageLogs = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('usage_logs')
          .select('id, feature, credits_used, created_at, request_data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setUsageLogs((data || []).map(log => ({
          ...log,
          request_data: log.request_data as UsageLog['request_data']
        })));
      } catch (error) {
        console.error('Error fetching usage logs:', error);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    if (user) {
      fetchUsageLogs();
    }
  }, [user]);

  // Filter logs by date range
  useEffect(() => {
    if (!usageLogs.length) {
      setFilteredLogs([]);
      return;
    }

    let filtered = [...usageLogs];

    if (dateFrom) {
      const fromDate = startOfDay(parseISO(dateFrom));
      filtered = filtered.filter(log => 
        isAfter(new Date(log.created_at), fromDate) || 
        format(new Date(log.created_at), 'yyyy-MM-dd') === dateFrom
      );
    }

    if (dateTo) {
      const toDate = endOfDay(parseISO(dateTo));
      filtered = filtered.filter(log => 
        isBefore(new Date(log.created_at), toDate) || 
        format(new Date(log.created_at), 'yyyy-MM-dd') === dateTo
      );
    }

    setFilteredLogs(filtered);
  }, [usageLogs, dateFrom, dateTo]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const plan = subscription?.plan;
  // Use realtime credits if available, fallback to subscription
  const creditsUsed = credits?.creditsUsed ?? subscription?.creditsUsed ?? 0;
  const creditsTotal = plan?.monthlyCredits || 10;
  const creditsRemaining = credits?.creditsRemaining ?? subscription?.creditsRemaining ?? 0;
  const usagePercent = creditsTotal > 0 ? (creditsUsed / creditsTotal) * 100 : 0;

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'enrichment': return '✨';
      case 'scraping': return '🔍';
      case 'training': return '🎓';
      case 'download': return '📥';
      default: return '📊';
    }
  };

  const csvEscape = (value: unknown) => {
    const s = String(value ?? '');
    // If it contains quotes, commas, or newlines, wrap and escape quotes for CSV safety
    if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const handleExportLogs = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : usageLogs;
    if (logsToExport.length === 0) {
      toast.error('No usage logs to export');
      return;
    }

    const header = ['Date', 'Feature', 'MFR', 'MPN', 'Category', 'Credits Used'];

    const rows = logsToExport.map((log) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.feature,
      log.request_data?.mfr || '',
      log.request_data?.mpn || '',
      log.request_data?.category || '',
      log.credits_used,
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usage_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Usage logs exported successfully');
  };

  const clearDateFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  // Logs to display (filtered or all)
  const logsToDisplay = (dateFrom || dateTo) ? filteredLogs : usageLogs;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Welcome back! Here's your usage overview.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="self-start sm:self-auto">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {/* Current Plan */}
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardDescription className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Current </span>Plan
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="text-lg sm:text-2xl font-bold text-foreground">
                  {plan?.name || 'Trial'}
                </span>
                <Badge variant={plan?.tier === 'trial' ? 'secondary' : 'default'} className="self-start sm:self-auto text-xs">
                  {plan?.tier || 'trial'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Credits Remaining */}
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardDescription className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Credits </span>Left
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                {creditsRemaining}
              </span>
              <span className="text-xs sm:text-base text-muted-foreground"> / {creditsTotal}</span>
            </CardContent>
          </Card>

          {/* Credits Used */}
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardDescription className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                Used
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                {creditsUsed}
              </span>
            </CardContent>
          </Card>

          {/* Period End */}
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardDescription className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                Renews
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <span className="text-sm sm:text-lg font-medium text-foreground">
                {subscription?.currentPeriodEnd 
                  ? format(new Date(subscription.currentPeriodEnd), 'MMM dd')
                  : 'N/A'}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Usage Progress */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Credit Usage</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Your credit consumption this billing period
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Used: {creditsUsed}</span>
                <span className="text-muted-foreground">Remaining: {creditsRemaining}</span>
              </div>
              <Progress value={usagePercent} className="h-2 sm:h-3" />
            </div>

            {plan?.tier === 'trial' && (
              <div className="mt-4 p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-foreground text-sm sm:text-base">Upgrade for more credits</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Get up to 2000 credits/month with our plans
                    </p>
                  </div>
                  <Button onClick={handleUpgrade} variant="glow" size="sm" className="self-start sm:self-auto">
                    <CreditCard className="w-4 h-4" />
                    Upgrade
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devices Section */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
              Active Devices
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {devices.length} of {maxDevices} devices active
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {devicesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No active devices found
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {devices.map((device) => (
                  <div 
                    key={device.id} 
                    className="flex items-start sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                      <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {device.deviceName || 'Unknown Device'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {device.browser} / {device.os}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last: {format(new Date(device.lastUsedAt), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDevice(device.id)}
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {devices.length >= maxDevices && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                  You've reached your device limit. Remove a device to log in from a new one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage History */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <History className="w-4 h-4 sm:w-5 sm:h-5" />
                    Usage History
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Recent requests and credit consumption
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportLogs} className="self-start sm:self-auto">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
              {/* Date Filters */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs sm:text-sm text-muted-foreground">Filter:</Label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dateFrom" className="text-xs">From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-32 sm:w-36 h-8 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dateTo" className="text-xs">To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-32 sm:w-36 h-8 text-xs sm:text-sm"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : logsToDisplay.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {(dateFrom || dateTo) ? 'No logs found for the selected date range.' : 'No usage history yet.'}
              </div>
            ) : (
              <div className="space-y-2">
                {logsToDisplay.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2"
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-lg sm:text-xl flex-shrink-0">{getFeatureIcon(log.feature)}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground capitalize text-sm">
                          {log.feature}
                          {log.request_data?.mpn && (
                            <span className="text-xs font-normal text-muted-foreground ml-1 sm:ml-2 hidden sm:inline">
                              ({log.request_data.mfr} - {log.request_data.mpn})
                            </span>
                          )}
                        </p>
                        {log.request_data?.mpn && (
                          <p className="text-xs text-muted-foreground truncate sm:hidden">
                            {log.request_data.mfr} - {log.request_data.mpn}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 text-xs">
                      -{log.credits_used}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
