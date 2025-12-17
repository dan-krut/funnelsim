import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, LogOut, Trash2, User, Copy, Search, X, BarChart3, Folder, AlertTriangle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { calculateFunnelRevenue, formatCurrency } from "@/lib/funnelCalculations";
import { Badge } from "@/components/ui/badge";
import { NewFunnelDialog } from "@/components/NewFunnelDialog";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { useAdmin } from "@/hooks/useAdmin";
import { UpgradePrompt } from "@/components/subscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import { useTheme } from "next-themes";

interface Funnel {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  nodes?: any;
  edges?: any;
  traffic_sources?: any;
  logo_url?: string | null;
}

/**
 * Inner Dashboard component that uses subscription context
 */
const DashboardContent = () => {
  const { user, signOut, loading } = useAuth();
  const { theme } = useTheme();
  const { config } = useWhitelabel();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newFunnelDialogOpen, setNewFunnelDialogOpen] = useState(false);
  const { toast } = useToast();

  // Subscription context for limit enforcement
  const {
    tier,
    canCreateFunnel,
    funnelCount,
    funnelLimit,
    isUnlimited,
    isOverLimit,
    isLoading: subscriptionLoading,
    refreshSubscription,
    initiateCheckout,
  } = useSubscription();

  // Fetch recommended tier for upgrade prompt
  const [recommendedTier, setRecommendedTier] = useState<any>(null);

  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      loadFunnels(true);
    }
  }, [user, debouncedSearch]);

  // Fetch recommended tier (Pro) for upgrade prompt
  useEffect(() => {
    const fetchRecommendedTier = async () => {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('name', 'Pro')
        .single();

      if (!error && data) {
        setRecommendedTier(data);
      }
    };

    fetchRecommendedTier();
  }, []);

  const loadFunnels = async (reset = false) => {
    if (reset) {
      setLoadingFunnels(true);
      setPage(0);
      setFunnels([]);
    } else {
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page;
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from("funnels")
      .select("id, name, created_at, updated_at, nodes, edges, traffic_sources, logo_url", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    // Add search filter if query exists
    if (debouncedSearch.trim()) {
      query = query.ilike("name", `%${debouncedSearch.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      toast({
        title: "Error loading funnels",
        description: error.message,
        variant: "destructive",
      });
    } else {
      if (reset) {
        setFunnels(data || []);
      } else {
        // Filter out duplicates when appending new funnels
        setFunnels((prev) => {
          const existingIds = new Set(prev.map(f => f.id));
          const newFunnels = (data || []).filter(f => !existingIds.has(f.id));
          return [...prev, ...newFunnels];
        });
      }
      setHasMore(count ? (currentPage + 1) * ITEMS_PER_PAGE < count : false);
      // Always increment page after loading, whether it's initial load or load more
      setPage(currentPage + 1);
    }

    setLoadingFunnels(false);
    setLoadingMore(false);
    setInitialLoad(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadFunnels(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const createNewFunnel = async () => {
    // Double-check funnel limit before creating
    if (!canCreateFunnel) {
      toast({
        title: "Funnel limit reached",
        description: `You've reached the maximum of ${funnelLimit} funnels on your ${tier?.name || "Free"} plan. Upgrade to create more.`,
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("funnels")
      .insert({
        user_id: user?.id,
        name: "Untitled Funnel",
        nodes: [],
        edges: [],
        traffic_sources: [],
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating funnel",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Refresh subscription data to update funnel count
      refreshSubscription();
      navigate(`/funnel/${data.id}`);
    }
  };

  const handleNewFunnelClick = () => {
    if (!canCreateFunnel) {
      // Don't open dialog, show upgrade toast instead
      toast({
        title: "Funnel limit reached",
        description: `Upgrade your plan to create more funnels.`,
      });
      return;
    }
    setNewFunnelDialogOpen(true);
  };

  const openDeleteDialog = (id: string, name: string) => {
    setFunnelToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!funnelToDelete) return;

    const { error } = await supabase.from("funnels").delete().eq("id", funnelToDelete.id);

    if (error) {
      toast({
        title: "Error deleting funnel",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Funnel deleted",
        description: `"${funnelToDelete.name}" has been deleted`,
      });
      // Remove the funnel from local state instead of reloading
      setFunnels((prev) => prev.filter((funnel) => funnel.id !== funnelToDelete.id));
      // Refresh subscription to update funnel count
      refreshSubscription();
    }

    setDeleteDialogOpen(false);
    setFunnelToDelete(null);
  };


  const cloneFunnel = async (funnelId: string) => {
    // Check funnel limit before cloning
    if (!canCreateFunnel) {
      toast({
        title: "Funnel limit reached",
        description: `You've reached the maximum of ${funnelLimit} funnels on your ${tier?.name || "Free"} plan. Upgrade to create more.`,
        variant: "destructive",
      });
      return;
    }

    // First, fetch the complete funnel data
    const { data: funnelData, error: fetchError } = await supabase
      .from("funnels")
      .select("*")
      .eq("id", funnelId)
      .single();

    if (fetchError || !funnelData) {
      toast({
        title: "Error cloning funnel",
        description: fetchError?.message || "Funnel not found",
        variant: "destructive",
      });
      return;
    }

    // Create a new funnel with the cloned data
    const { data: clonedFunnel, error: cloneError } = await supabase
      .from("funnels")
      .insert({
        user_id: user?.id,
        name: `${funnelData.name} (cloned)`,
        nodes: funnelData.nodes,
        edges: funnelData.edges,
        traffic_sources: funnelData.traffic_sources,
      })
      .select()
      .single();

    if (cloneError) {
      toast({
        title: "Error cloning funnel",
        description: cloneError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Funnel cloned",
        description: `"${clonedFunnel.name}" has been created`,
      });
      // Add the cloned funnel to the top of the list, ensuring no duplicates
      setFunnels((prev) => {
        const filtered = prev.filter(f => f.id !== clonedFunnel.id);
        return [clonedFunnel, ...filtered];
      });
      // Refresh subscription to update funnel count
      refreshSubscription();
    }
  };

  const handleUpgrade = async () => {
    if (recommendedTier?.stripe_price_id_monthly) {
      try {
        await initiateCheckout(recommendedTier.stripe_price_id_monthly);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to start checkout",
          variant: "destructive",
        });
      }
    } else {
      // Navigate to profile for upgrade options
      navigate("/profile");
    }
  };

  if (loading || initialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isAtLimit = !canCreateFunnel && !isUnlimited;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img
              src={theme === "dark"
                ? (config.logo_dark_url || logoDark)
                : (config.logo_light_url || logo)}
              alt={config.brand_name || "Funnel Builder"}
              className="h-8"
            />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} title="Admin">
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Over Limit Warning (after downgrade) */}
        {isOverLimit && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Funnel Limit Exceeded</AlertTitle>
            <AlertDescription>
              You have {funnelCount} funnels but your {tier?.name || "current"} plan only allows {funnelLimit}.
              Your existing funnels are still accessible, but you cannot create new ones until you upgrade or delete some funnels.
              <Button variant="link" className="p-0 h-auto ml-1" onClick={handleUpgrade}>
                Upgrade now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Funnels</h2>
            <p className="text-muted-foreground">View and manage all your conversion funnels</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search funnels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              onClick={handleNewFunnelClick}
              disabled={isAtLimit}
              title={isAtLimit ? `You've reached your ${funnelLimit} funnel limit. Upgrade to create more.` : "Create a new funnel"}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Funnel
            </Button>
          </div>
        </div>

        {/* Upgrade Prompt when at limit */}
        {isAtLimit && !isOverLimit && (
          <UpgradePrompt
            currentTier={tier}
            funnelCount={funnelCount}
            funnelLimit={funnelLimit}
            onUpgrade={handleUpgrade}
            recommendedTier={recommendedTier}
          />
        )}

        {/* Funnels Grid */}
        {funnels.length === 0 && !loadingFunnels ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <Folder className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">
                  {searchQuery ? "No funnels found" : "No funnels yet"}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? `No funnels match "${searchQuery}"`
                    : "Create your first funnel to start tracking conversions"}
                </p>
                {searchQuery ? (
                  <Button onClick={clearSearch} variant="outline">
                    Clear Search
                  </Button>
                ) : (
                  <Button
                    onClick={handleNewFunnelClick}
                    size="lg"
                    disabled={isAtLimit}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Funnel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {funnels.map((funnel) => {
                const revenue = calculateFunnelRevenue(
                  Array.isArray(funnel.nodes) ? funnel.nodes : [],
                  Array.isArray(funnel.edges) ? funnel.edges : [],
                  Array.isArray(funnel.traffic_sources) ? funnel.traffic_sources : []
                );

                return (
                  <Card
                    key={funnel.id}
                    className="group hover:shadow-md transition-all duration-200 hover:border-primary/50 relative cursor-pointer"
                    onClick={() => navigate(`/funnel/${funnel.id}`)}
                  >
                    <CardHeader className="pb-4">
                      <div className="absolute top-4 right-4">
                        <Badge
                          variant="secondary"
                          className={`${
                            revenue > 0
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                              : revenue < 0
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {formatCurrency(revenue)}
                        </Badge>
                      </div>
                      <div className="space-y-3 pr-20">
                        {funnel.logo_url ? (
                          <img
                            src={funnel.logo_url}
                            alt="Funnel logo"
                            className="h-[30px] w-auto object-contain"
                          />
                        ) : (
                          <div className="h-[30px] w-[30px] rounded bg-muted flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="line-clamp-2 text-xl">{funnel.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {format(new Date(funnel.updated_at), "MMM d, yyyy 'at' h:mm a")}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            disabled={isAtLimit}
                            title={isAtLimit ? "Upgrade to clone funnels" : "Clone funnel"}
                            onClick={(e) => {
                              e.stopPropagation();
                              cloneFunnel(funnel.id);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(funnel.id, funnel.name);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                  size="lg"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
    </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Funnel?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{funnelToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewFunnelDialog
        open={newFunnelDialogOpen}
        onOpenChange={setNewFunnelDialogOpen}
        onCreateBlank={createNewFunnel}
        userId={user?.id}
      />
    </div>
  );
};

/**
 * Dashboard page wrapped with SubscriptionProvider
 */
const Dashboard = () => {
  return (
    <SubscriptionProvider>
      <DashboardContent />
    </SubscriptionProvider>
  );
};

export default Dashboard;
