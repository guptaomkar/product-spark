import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
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
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const navigate = useNavigate();

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

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const plan = subscription?.plan;
  const creditsUsed = subscription?.creditsUsed || 0;
  const creditsTotal = plan?.monthlyCredits || 10;
  const creditsRemaining = subscription?.creditsRemaining || 0;
  const usagePercent = (creditsUsed / creditsTotal) * 100;

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

  const handleExportLogs = () => {
    if (usageLogs.length === 0) {
      toast.error('No usage logs to export');
      return;
    }

    const csvContent = [
      ['Date', 'Feature', 'MFR', 'MPN', 'Category', 'Credits Used'].join(','),
      ...usageLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.feature,
        log.request_data?.mfr || '',
        log.request_data?.mpn || '',
        log.request_data?.category || '',
        log.credits_used
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usage_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Usage logs exported successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's your usage overview.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Current Plan */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Current Plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {plan?.name || 'Trial'}
                </span>
                <Badge variant={plan?.tier === 'trial' ? 'secondary' : 'default'}>
                  {plan?.tier || 'trial'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Credits Remaining */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Credits Remaining
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-foreground">
                {creditsRemaining}
              </span>
              <span className="text-muted-foreground"> / {creditsTotal}</span>
            </CardContent>
          </Card>

          {/* Credits Used */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Credits Used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-foreground">
                {creditsUsed}
              </span>
            </CardContent>
          </Card>

          {/* Period End */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Renews On
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-lg font-medium text-foreground">
                {subscription?.currentPeriodEnd 
                  ? format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')
                  : 'N/A'}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Usage Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Credit Usage</CardTitle>
            <CardDescription>
              Your credit consumption this billing period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used: {creditsUsed}</span>
                <span className="text-muted-foreground">Remaining: {creditsRemaining}</span>
              </div>
              <Progress value={usagePercent} className="h-3" />
            </div>

            {plan?.tier === 'trial' && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">Upgrade for more credits</h4>
                    <p className="text-sm text-muted-foreground">
                      Get up to 2000 credits/month with our plans
                    </p>
                  </div>
                  <Button onClick={handleUpgrade} variant="glow">
                    <CreditCard className="w-4 h-4" />
                    Upgrade
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Usage History
              </CardTitle>
              <CardDescription>
                Recent requests and credit consumption
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportLogs}>
              <Download className="w-4 h-4" />
              Export
            </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : usageLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No usage history yet. Start using the platform to see your activity.
              </div>
            ) : (
              <div className="space-y-2">
                {usageLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getFeatureIcon(log.feature)}</span>
                      <div>
                        <p className="font-medium text-foreground capitalize">
                          {log.feature}
                          {log.request_data?.mpn && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                              ({log.request_data.mfr} - {log.request_data.mpn})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      -{log.credits_used} credit{log.credits_used > 1 ? 's' : ''}
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
