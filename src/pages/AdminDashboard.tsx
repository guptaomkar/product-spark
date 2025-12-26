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
import { AdminContactSubmissions } from '@/components/admin/AdminContactSubmissions';
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
  UserX,
  MessageSquare
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
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage users, subscriptions, and platform settings
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')} className="self-start sm:self-auto">
            <Settings className="w-4 h-4" />
            <span className="sm:inline">Settings</span>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Total</span> Users
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <span className="text-xl sm:text-3xl font-bold text-foreground">
                {stats?.totalUsers || 0}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Active</span> Subs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <span className="text-xl sm:text-3xl font-bold text-foreground">
                {stats?.activeSubscriptions || 0}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                Revenue
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <span className="text-xl sm:text-3xl font-bold text-foreground">
                ₹{((stats?.totalRevenue || 0) / 1000).toFixed(1)}k
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                Requests
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <span className="text-xl sm:text-3xl font-bold text-foreground">
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
        <div className="mb-6 sm:mb-8">
          <PlanManagement />
        </div>

        {/* Contact Submissions Section */}
        <div className="mb-6 sm:mb-8">
          <AdminContactSubmissions />
        </div>

        {/* Users Table with Tabs */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Users</CardTitle>
                  <CardDescription className="text-sm">Manage user accounts and subscriptions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportUsers} className="self-start sm:self-auto">
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export to </span>Excel
                </Button>
              </div>
              
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
                  <TabsTrigger value="all" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">All</span> ({users.length})
                  </TabsTrigger>
                  <TabsTrigger value="trial" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                    <UserX className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Trial</span> ({stats?.trialUsers || 0})
                  </TabsTrigger>
                  <TabsTrigger value="subscribed" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                    <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Paid</span> ({stats?.subscribedUsers || 0})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-full sm:w-[130px]">
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
                    <SelectTrigger className="w-full sm:w-[130px]">
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
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2 sm:space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div 
                    key={u.id} 
                    className="p-3 sm:p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border"
                    onClick={() => navigate(`/admin/user/${u.id}`)}
                  >
                    {/* Mobile layout */}
                    <div className="flex flex-col gap-3 sm:hidden">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {u.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate max-w-[180px]">{u.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {u.fullName || 'No name'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={u.subscription?.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {u.subscription?.planName || 'No plan'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span>{u.subscription?.creditsRemaining || 0} credits</span>
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            {u.activeDevicesCount}/{getEffectiveMaxDevices(u)}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                    
                    {/* Desktop layout */}
                    <div className="hidden sm:flex sm:items-center sm:justify-between">
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
