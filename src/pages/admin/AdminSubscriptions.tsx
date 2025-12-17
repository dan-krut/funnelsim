import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CreditCard, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { SubscriptionTable } from "@/components/admin/SubscriptionTable";
import type { UserSubscription, SubscriptionTier } from "@/integrations/supabase/types";

type SubscriptionStatus = 'all' | 'active' | 'canceled' | 'past_due';

const ITEMS_PER_PAGE = 20;

/**
 * Admin subscriptions page for viewing all subscription data.
 * Features filtering by status and subscription details display.
 */
export const AdminSubscriptions = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus>('all');

  // Stats
  const [stats, setStats] = useState({
    active: 0,
    canceled: 0,
    past_due: 0,
    total: 0,
  });

  // Fetch tiers on mount
  useEffect(() => {
    fetchTiers();
  }, []);

  // Fetch subscriptions when filters change
  useEffect(() => {
    fetchSubscriptions();
  }, [page, statusFilter]);

  const fetchTiers = async () => {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setTiers(data);
    }
  };

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query
      let query = supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact' });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply pagination
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query
        .range(from, to)
        .order('updated_at', { ascending: false });

      const { data: subscriptionData, count, error: subError } = await query;

      if (subError) {
        throw subError;
      }

      setSubscriptions(subscriptionData || []);
      setTotalCount(count || 0);

      // Fetch users for these subscriptions
      if (subscriptionData && subscriptionData.length > 0) {
        const userIds = [...new Set(subscriptionData.map((s) => s.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        setUsers(profilesData || []);
      }

      // Fetch stats (only on first load or refresh)
      if (page === 0) {
        await fetchStats();
      }
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error loading subscriptions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, toast]);

  const fetchStats = async () => {
    try {
      // Get counts by status
      const { count: activeCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: canceledCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'canceled');

      const { count: pastDueCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'past_due');

      const { count: totalCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true });

      setStats({
        active: activeCount || 0,
        canceled: canceledCount || 0,
        past_due: pastDueCount || 0,
        total: totalCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = () => {
    fetchSubscriptions();
    fetchStats();
  };

  const handleStatusFilterChange = (value: SubscriptionStatus) => {
    setStatusFilter(value);
    setPage(0);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasMore = page < totalPages - 1;
  const hasPrevious = page > 0;

  if (isLoading && page === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            View and manage all user subscriptions
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceled</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500 rotate-180" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.canceled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Due</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.past_due}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Filter by status:</span>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                      Active
                    </Badge>
                  </span>
                </SelectItem>
                <SelectItem value="canceled">
                  <span className="flex items-center gap-2">
                    <Badge className="bg-gray-500/10 text-gray-700 border-gray-500/20">
                      Canceled
                    </Badge>
                  </span>
                </SelectItem>
                <SelectItem value="past_due">
                  <span className="flex items-center gap-2">
                    <Badge className="bg-red-500/10 text-red-700 border-red-500/20">
                      Past Due
                    </Badge>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscription List */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription List</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading...'
              : `Showing ${subscriptions.length} of ${totalCount} subscriptions`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionTable
            subscriptions={subscriptions}
            tiers={tiers}
            users={users}
            isLoading={isLoading}
          />

          {/* Pagination */}
          {totalCount > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!hasPrevious || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;
