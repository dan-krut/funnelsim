import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  CreditCard,
  TrendingUp,
  Package,
  ArrowRight,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import type { UserSubscription, SubscriptionTier } from "@/integrations/supabase/types";

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  tierBreakdown: Record<string, number>;
}

interface RecentActivity {
  id: string;
  user_email: string;
  tier_name: string;
  status: string;
  updated_at: string;
}

/**
 * Admin dashboard page showing overview statistics.
 * Displays total users, active subscriptions, revenue estimates,
 * and recent subscription activity.
 */
export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    tierBreakdown: {},
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch all tiers
      const { data: tiersData } = await supabase
        .from('subscription_tiers')
        .select('*')
        .order('sort_order', { ascending: true });

      if (tiersData) {
        setTiers(tiersData);
      }

      // Fetch total user count from profiles
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch all subscriptions with tier info
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_tiers(name, price_monthly)')
        .order('updated_at', { ascending: false });

      // Calculate stats
      let activeCount = 0;
      let monthlyRevenue = 0;
      const tierCounts: Record<string, number> = {};

      subscriptions?.forEach((sub: any) => {
        if (sub.status === 'active') {
          activeCount++;
          monthlyRevenue += sub.subscription_tiers?.price_monthly || 0;
        }

        const tierName = sub.subscription_tiers?.name || 'Unknown';
        tierCounts[tierName] = (tierCounts[tierName] || 0) + 1;
      });

      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: activeCount,
        totalRevenue: monthlyRevenue,
        tierBreakdown: tierCounts,
      });

      // Get recent activity (last 5 subscription changes)
      const recent = subscriptions?.slice(0, 5).map((sub: any) => ({
        id: sub.id,
        user_email: sub.user_id, // Will be resolved separately
        tier_name: sub.subscription_tiers?.name || 'Unknown',
        status: sub.status,
        updated_at: sub.updated_at,
      })) || [];

      // Fetch emails for recent activity
      if (recent.length > 0) {
        const userIds = recent.map((r: RecentActivity) => r.user_email);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const emailMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          if (p.email) {
            emailMap[p.id] = p.email;
          }
        });

        const activityWithEmails = recent.map((r: RecentActivity) => ({
          ...r,
          user_email: emailMap[r.user_email] || 'Unknown',
        }));

        setRecentActivity(activityWithEmails);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'canceled':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      case 'past_due':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your platform's subscription metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Paying customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated MRR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Tiers</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tiers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active subscription tiers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lower Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Jump to management sections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/admin/users">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manage Users
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/admin/products">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Edit Products
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/admin/subscriptions">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  View Subscriptions
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest subscription changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.updated_at
                          ? format(new Date(activity.updated_at), 'MMM d, h:mm a')
                          : 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="outline">{activity.tier_name}</Badge>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      {Object.keys(stats.tierBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tier Breakdown</CardTitle>
            <CardDescription>
              Users by subscription tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {Object.entries(stats.tierBreakdown).map(([tierName, count]) => (
                <div
                  key={tierName}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <span className="font-medium">{tierName}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
