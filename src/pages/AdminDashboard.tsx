import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminCharts } from '@/components/admin/AdminCharts';
import { PlanManagement } from '@/components/admin/PlanManagement';
import { 
  Shield, 
  Users, 
  CreditCard, 
  Activity,
  Search,
  Settings,
  Loader2,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Smartphone,
  Download,
  Filter,
  UserCheck,
  UserX
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
  subscription: {
    planName: string;
    planTier: string;
    creditsRemaining: number;
    creditsUsed: number;
    status: string;
    maxDevices: number;
    maxDevicesOverride: number | null;
  } | null;
  activeDevicesCount: number;
  totalDevicesCount: number;
  totalRequests: number;
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalRequests: number;
  trialUsers: number;
  subscribedUsers: number;
  totalCreditsUsed: number;
  totalCreditsRemaining: number;
}

export default function AdminDashboard() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      toast.error('Access denied. Admin privileges required.');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchAdminData = async () => {
    if (!isAdmin) return;

    try {
      // Fetch profiles with subscriptions
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch subscriptions with plan details
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (name, tier, max_devices)
        `);

      if (subError) throw subError;

      // Fetch device counts (all devices and active devices)
      const { data: devices, error: devicesError } = await supabase
        .from('user_devices')
        .select('user_id, id, is_active');

      if (devicesError) throw devicesError;

      // Fetch usage logs for request counts
      const { data: usageLogs, error: logsError } = await supabase
        .from('usage_logs')
        .select('user_id, credits_used');

      if (logsError) throw logsError;

      // Fetch payments for revenue (only completed payments)
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, status');

      if (paymentsError) throw paymentsError;

      // Build device counts
      const activeDeviceCounts: Record<string, number> = {};
      const totalDeviceCounts: Record<string, number> = {};
      devices?.forEach(d => {
        totalDeviceCounts[d.user_id] = (totalDeviceCounts[d.user_id] || 0) + 1;
        if (d.is_active) {
          activeDeviceCounts[d.user_id] = (activeDeviceCounts[d.user_id] || 0) + 1;
        }
      });

      const requestCounts: Record<string, number> = {};
      usageLogs?.forEach(l => {
        if (l.user_id) {
          requestCounts[l.user_id] = (requestCounts[l.user_id] || 0) + l.credits_used;
        }
      });

      const subMap: Record<string, any> = {};
      subscriptions?.forEach(s => {
        subMap[s.user_id] = s;
      });

      const adminUsers: AdminUser[] = (profiles || []).map(p => {
        const sub = subMap[p.user_id];
        const plan = sub?.subscription_plans as { name: string; tier: string; max_devices: number } | null;
        
        return {
          id: p.user_id,
          email: p.email,
          fullName: p.full_name,
          createdAt: p.created_at,
          subscription: sub ? {
            planName: plan?.name || 'Unknown',
            planTier: plan?.tier || 'trial',
            creditsRemaining: sub.credits_remaining,
            creditsUsed: sub.credits_used,
            status: sub.status,
            maxDevices: plan?.max_devices || 1,
            maxDevicesOverride: sub.max_devices_override,
          } : null,
          activeDevicesCount: activeDeviceCounts[p.user_id] || 0,
          totalDevicesCount: totalDeviceCounts[p.user_id] || 0,
          totalRequests: requestCounts[p.user_id] || 0
        };
      });

      setUsers(adminUsers);

      // Calculate stats
      const completedPayments = payments?.filter(p => p.status === 'completed') || [];
      const totalRevenue = completedPayments.reduce((sum, p) => {
        const amount = typeof p.amount === 'string' ? parseFloat(p.amount) : Number(p.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const trialUsers = adminUsers.filter(u => 
        !u.subscription || u.subscription.planTier === 'trial'
      ).length;
      
      const subscribedUsers = adminUsers.filter(u => 
        u.subscription && u.subscription.planTier !== 'trial' && u.subscription.status === 'active'
      ).length;

      const totalCreditsUsed = subscriptions?.reduce((sum, s) => sum + (s.credits_used || 0), 0) || 0;
      const totalCreditsRemaining = subscriptions?.reduce((sum, s) => sum + (s.credits_remaining || 0), 0) || 0;

      setStats({
        totalUsers: profiles?.length || 0,
        activeSubscriptions: subscriptions?.filter(s => s.status === 'active').length || 0,
        totalRevenue,
        totalRequests: usageLogs?.reduce((sum, l) => sum + l.credits_used, 0) || 0,
        trialUsers,
        subscribedUsers,
        totalCreditsUsed,
        totalCreditsRemaining,
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter by tab (trial vs subscribed)
    if (activeTab === 'trial') {
      filtered = filtered.filter(u => !u.subscription || u.subscription.planTier === 'trial');
    } else if (activeTab === 'subscribed') {
      filtered = filtered.filter(u => u.subscription && u.subscription.planTier !== 'trial');
    }

    // Filter by plan
    if (planFilter !== 'all') {
      filtered = filtered.filter(u => u.subscription?.planTier === planFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.subscription?.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(query) ||
        u.fullName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, activeTab, planFilter, statusFilter, searchQuery]);

  const csvEscape = (value: unknown) => {
    const s = String(value ?? '');
    if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const handleExportUsers = () => {
    if (filteredUsers.length === 0) {
      toast.error('No users to export');
      return;
    }

    const header = [
      'Email',
      'Full Name',
      'Joined Date',
      'Plan',
      'Plan Tier',
      'Status',
      'Credits Remaining',
      'Credits Used',
      'Active Devices',
      'Max Devices',
      'Total Requests'
    ];

    const rows = filteredUsers.map((u) => [
      u.email,
      u.fullName || '',
      format(new Date(u.createdAt), 'yyyy-MM-dd'),
      u.subscription?.planName || 'No Plan',
      u.subscription?.planTier || 'N/A',
      u.subscription?.status || 'N/A',
      u.subscription?.creditsRemaining || 0,
      u.subscription?.creditsUsed || 0,
      u.activeDevicesCount,
      u.subscription?.maxDevicesOverride || u.subscription?.maxDevices || 1,
      u.totalRequests,
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Users exported successfully');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const getEffectiveMaxDevices = (u: AdminUser) => {
    return u.subscription?.maxDevicesOverride || u.subscription?.maxDevices || 1;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage users, subscriptions, and platform settings
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/settings')}>
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-foreground">
                {stats?.totalUsers || 0}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Active Subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-foreground">
                {stats?.activeSubscriptions || 0}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-foreground">
                ₹{(stats?.totalRevenue || 0).toLocaleString()}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Total Requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-foreground">
                {stats?.totalRequests || 0}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        {stats && (
          <AdminCharts
            trialUsers={stats.trialUsers}
            subscribedUsers={stats.subscribedUsers}
            totalCreditsUsed={stats.totalCreditsUsed}
            totalCreditsRemaining={stats.totalCreditsRemaining}
          />
        )}

        {/* Plan Management Section */}
        <div className="mb-8">
          <PlanManagement />
        </div>

        {/* Users Table with Tabs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Manage user accounts and subscriptions</CardDescription>
                </div>
                <Button variant="outline" onClick={handleExportUsers}>
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
              
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    All Users ({users.length})
                  </TabsTrigger>
                  <TabsTrigger value="trial" className="flex items-center gap-2">
                    <UserX className="w-4 h-4" />
                    Trial Users ({stats?.trialUsers || 0})
                  </TabsTrigger>
                  <TabsTrigger value="subscribed" className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Subscribed ({stats?.subscribedUsers || 0})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div 
                    key={u.id} 
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/user/${u.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-lg font-medium text-primary">
                          {u.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {u.fullName || 'No name'} • Joined {format(new Date(u.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant={u.subscription?.status === 'active' ? 'default' : 'secondary'}>
                          {u.subscription?.planName || 'No plan'}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {u.subscription?.creditsRemaining || 0} credits left
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground" title="Active / Max Devices">
                        <Smartphone className="w-4 h-4" />
                        <span className="text-sm">
                          {u.activeDevicesCount}/{getEffectiveMaxDevices(u)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground" title="Total Requests">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">{u.totalRequests}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
