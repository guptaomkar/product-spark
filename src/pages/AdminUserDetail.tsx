import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, User, CreditCard, Laptop, Activity, Mail, Calendar, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  createdAt: string;
}

interface UserSubscriptionDetail {
  id: string;
  planName: string;
  planTier: string;
  status: string;
  creditsRemaining: number;
  creditsUsed: number;
  currentPeriodEnd: string;
  billingCycle: string;
}

interface UserDevice {
  id: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  isActive: boolean;
}

interface UsageLog {
  id: string;
  feature: string;
  creditsUsed: number;
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  planTier: string;
  createdAt: string;
}

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscriptionDetail | null>(null);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!userId || !isAdmin) return;

    const fetchUserData = async () => {
      setIsLoading(true);

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileData) {
          setProfile({
            id: profileData.id,
            userId: profileData.user_id,
            email: profileData.email,
            fullName: profileData.full_name,
            createdAt: profileData.created_at
          });
        }

        // Fetch role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (roleData) {
          setUserRole(roleData.role);
        }

        // Fetch subscription with plan details
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('user_id', userId)
          .maybeSingle();

        if (subData) {
          const plan = subData.subscription_plans as unknown as { 
            name: string; 
            tier: string 
          } | null;
          
          setSubscription({
            id: subData.id,
            planName: plan?.name || 'Unknown',
            planTier: plan?.tier || 'unknown',
            status: subData.status,
            creditsRemaining: subData.credits_remaining,
            creditsUsed: subData.credits_used,
            currentPeriodEnd: subData.current_period_end,
            billingCycle: subData.billing_cycle
          });
        }

        // Fetch devices
        const { data: deviceData } = await supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', userId)
          .order('last_used_at', { ascending: false });

        if (deviceData) {
          setDevices(deviceData.map(d => ({
            id: d.id,
            deviceName: d.device_name,
            browser: d.browser,
            os: d.os,
            ipAddress: d.ip_address,
            lastUsedAt: d.last_used_at,
            isActive: d.is_active
          })));
        }

        // Fetch usage logs
        const { data: usageData } = await supabase
          .from('usage_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (usageData) {
          setUsageLogs(usageData.map(u => ({
            id: u.id,
            feature: u.feature,
            creditsUsed: u.credits_used,
            createdAt: u.created_at
          })));
        }

        // Fetch payments
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (paymentData) {
          setPayments(paymentData.map(p => ({
            id: p.id,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status,
            planTier: p.plan_tier,
            createdAt: p.created_at
          })));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId, isAdmin]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'pro': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'basic': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      case 'expired': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-amber-500/20 text-amber-400';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Button>

        {/* User Header */}
        {profile && (
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{profile.fullName || 'No Name'}</h1>
                {userRole === 'admin' && (
                  <Badge className="bg-purple-500/20 text-purple-400">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <Badge className={getTierColor(subscription.planTier)}>
                      {subscription.planName}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Credits Remaining</span>
                    <span className="font-medium">{subscription.creditsRemaining}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Credits Used</span>
                    <span className="font-medium">{subscription.creditsUsed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Billing Cycle</span>
                    <span className="capitalize">{subscription.billingCycle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Period Ends</span>
                    <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No subscription found</p>
              )}
            </CardContent>
          </Card>

          {/* Devices Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-primary" />
                Devices ({devices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="text-sm font-medium">{device.deviceName || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {device.browser} / {device.os}
                        </p>
                      </div>
                      <Badge variant={device.isActive ? 'default' : 'secondary'}>
                        {device.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No devices registered</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Logs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Usage
            </CardTitle>
            <CardDescription>Last 50 usage logs</CardDescription>
          </CardHeader>
          <CardContent>
            {usageLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="capitalize">{log.feature.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{log.creditsUsed}</TableCell>
                      <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No usage logs found</p>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="capitalize">{payment.planTier}</TableCell>
                      <TableCell>
                        {payment.currency} {payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(payment.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No payments found</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
