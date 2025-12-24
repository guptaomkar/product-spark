import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Smartphone
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
    creditsRemaining: number;
    creditsUsed: number;
    status: string;
  } | null;
  devicesCount: number;
  totalRequests: number;
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalRequests: number;
}

export default function AdminDashboard() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      toast.error('Access denied. Admin privileges required.');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!isAdmin) return;

      try {
        // Fetch profiles with subscriptions
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        // Fetch subscriptions
        const { data: subscriptions, error: subError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (name)
          `);

        if (subError) throw subError;

        // Fetch device counts
        const { data: devices, error: devicesError } = await supabase
          .from('user_devices')
          .select('user_id, id');

        if (devicesError) throw devicesError;

        // Fetch usage logs for request counts
        const { data: usageLogs, error: logsError } = await supabase
          .from('usage_logs')
          .select('user_id, credits_used');

        if (logsError) throw logsError;

        // Fetch payments for revenue
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount, status');

        if (paymentsError) throw paymentsError;

        // Build user list
        const deviceCounts: Record<string, number> = {};
        devices?.forEach(d => {
          deviceCounts[d.user_id] = (deviceCounts[d.user_id] || 0) + 1;
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

        const adminUsers: AdminUser[] = (profiles || []).map(p => ({
          id: p.user_id,
          email: p.email,
          fullName: p.full_name,
          createdAt: p.created_at,
          subscription: subMap[p.user_id] ? {
            planName: (subMap[p.user_id].subscription_plans as any)?.name || 'Unknown',
            creditsRemaining: subMap[p.user_id].credits_remaining,
            creditsUsed: subMap[p.user_id].credits_used,
            status: subMap[p.user_id].status
          } : null,
          devicesCount: deviceCounts[p.user_id] || 0,
          totalRequests: requestCounts[p.user_id] || 0
        }));

        setUsers(adminUsers);

        // Calculate stats
        const totalRevenue = payments
          ?.filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount as unknown as string), 0) || 0;

        setStats({
          totalUsers: profiles?.length || 0,
          activeSubscriptions: subscriptions?.filter(s => s.status === 'active').length || 0,
          totalRevenue,
          totalRequests: usageLogs?.reduce((sum, l) => sum + l.credits_used, 0) || 0
        });

      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

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

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user accounts and subscriptions</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
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
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Smartphone className="w-4 h-4" />
                        <span className="text-sm">{u.devicesCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
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
