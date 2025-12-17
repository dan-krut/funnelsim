import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
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
import { Package, Edit, RefreshCw, Infinity, Plus, Trash2, AlertCircle } from "lucide-react";
import { TierEditor } from "@/components/admin/TierEditor";
import { TierCreator } from "@/components/admin/TierCreator";
import type { SubscriptionTier, SubscriptionTierUpdate, SubscriptionTierInsert } from "@/integrations/supabase/types";

/**
 * Admin products page for managing subscription tiers.
 * Lists all tiers with the ability to create, edit, and delete.
 * Prevents deletion of tiers that have active subscribers.
 */
export const AdminProducts = () => {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [subscriberCounts, setSubscriberCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteBlockedTier, setDeleteBlockedTier] = useState<{
    tier: SubscriptionTier;
    subscriberCount: number;
  } | null>(null);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState<{
    open: boolean;
    tier: SubscriptionTier | null;
  }>({ open: false, tier: null });

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      // Fetch all tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('subscription_tiers')
        .select('*')
        .order('sort_order', { ascending: true });

      if (tiersError) {
        throw tiersError;
      }

      setTiers(tiersData || []);

      // Fetch subscriber counts for each tier
      const counts: Record<string, number> = {};

      for (const tier of tiersData || []) {
        const { count } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('tier_id', tier.id)
          .eq('status', 'active');

        counts[tier.id] = count || 0;
      }

      setSubscriberCounts(counts);
    } catch (error: any) {
      console.error('Error loading tiers:', error);
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTier = async (newTier: SubscriptionTierInsert) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('subscription_tiers')
        .insert(newTier);

      if (error) {
        throw error;
      }

      toast({
        title: "Product created",
        description: `${newTier.name} has been created successfully`,
      });

      // Refresh tiers list
      await loadTiers();
      setIsCreating(false);
    } catch (error: any) {
      console.error('Error creating tier:', error);
      toast({
        title: "Error creating product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTier = async (tierId: string, updates: SubscriptionTierUpdate) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('subscription_tiers')
        .update(updates)
        .eq('id', tierId);

      if (error) {
        throw error;
      }

      toast({
        title: "Tier updated",
        description: "The subscription tier has been updated successfully",
      });

      // Refresh tiers list
      await loadTiers();
      setEditingTier(null);
    } catch (error: any) {
      console.error('Error saving tier:', error);
      toast({
        title: "Error saving tier",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (tier: SubscriptionTier) => {
    const subscriberCount = subscriberCounts[tier.id] || 0;

    if (subscriberCount > 0) {
      // Show blocking alert
      setDeleteBlockedTier({ tier, subscriberCount });
    } else {
      // Show confirmation dialog
      setConfirmDeleteDialog({ open: true, tier });
    }
  };

  const handleConfirmDelete = async () => {
    const tier = confirmDeleteDialog.tier;
    if (!tier) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('subscription_tiers')
        .delete()
        .eq('id', tier.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Product deleted",
        description: `${tier.name} has been deleted successfully`,
      });

      // Refresh tiers list
      await loadTiers();
    } catch (error: any) {
      console.error('Error deleting tier:', error);
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setConfirmDeleteDialog({ open: false, tier: null });
    }
  };

  const handleEditClick = (tier: SubscriptionTier) => {
    setEditingTier(tier);
  };

  const handleCancelEdit = () => {
    setEditingTier(null);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show creator if creating
  if (isCreating) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Product</h1>
          <p className="text-muted-foreground">
            Add a new subscription tier
          </p>
        </div>

        <TierCreator
          onSave={handleCreateTier}
          onCancel={handleCancelCreate}
          isSaving={isSaving}
          existingTiersCount={tiers.length}
        />
      </div>
    );
  }

  // Show editor if editing
  if (editingTier) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground">
            Update subscription tier properties
          </p>
        </div>

        <TierEditor
          tier={editingTier}
          onSave={handleSaveTier}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage subscription tiers and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadTiers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Delete blocked alert */}
      {deleteBlockedTier && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cannot Delete Tier</AlertTitle>
          <AlertDescription>
            <strong>{deleteBlockedTier.tier.name}</strong> has {deleteBlockedTier.subscriberCount} active subscriber
            {deleteBlockedTier.subscriberCount !== 1 ? 's' : ''}.
            You must reassign subscribers to another tier before deletion is possible.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => setDeleteBlockedTier(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tiers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          const subscriberCount = subscriberCounts[tier.id] || 0;
          const features = tier.features as string[] | null;

          return (
            <Card key={tier.id} className={!tier.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>{tier.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {!tier.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(tier)}
                      title="Edit tier"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(tier)}
                      title="Delete tier"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription data-testid={`subscriber-count-${tier.id}`}>
                  {subscriberCount} active subscriber{subscriberCount !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(tier.price_monthly)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                  {tier.price_yearly > 0 && (
                    <div className="text-sm text-muted-foreground">
                      or {formatCurrency(tier.price_yearly)}/year
                    </div>
                  )}
                  {tier.price_lifetime > 0 && (
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      or {formatCurrency(tier.price_lifetime)} lifetime
                    </div>
                  )}
                </div>

                {/* Funnel Limit */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Funnel limit:</span>
                  {tier.max_funnels === -1 ? (
                    <span className="flex items-center gap-1 font-medium">
                      <Infinity className="h-4 w-4" />
                      Unlimited
                    </span>
                  ) : (
                    <span className="font-medium">{tier.max_funnels} funnels</span>
                  )}
                </div>

                {/* Stripe IDs */}
                {tier.stripe_product_id && (
                  <div className="text-xs text-muted-foreground">
                    <p>Product: {tier.stripe_product_id}</p>
                    {tier.stripe_price_id_monthly && (
                      <p>Monthly: {tier.stripe_price_id_monthly}</p>
                    )}
                    {tier.stripe_price_id_yearly && (
                      <p>Yearly: {tier.stripe_price_id_yearly}</p>
                    )}
                    {tier.stripe_price_id_lifetime && (
                      <p>Lifetime: {tier.stripe_price_id_lifetime}</p>
                    )}
                  </div>
                )}

                {/* Features */}
                {features && features.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Features
                    </p>
                    <ul className="text-sm space-y-1">
                      {features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="text-muted-foreground">
                          - {feature}
                        </li>
                      ))}
                      {features.length > 4 && (
                        <li className="text-muted-foreground">
                          + {features.length - 4} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tiers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No subscription tiers</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Create your first subscription tier to get started.
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirm Delete Dialog */}
      <AlertDialog
        open={confirmDeleteDialog.open}
        onOpenChange={(open) => !open && setConfirmDeleteDialog({ open: false, tier: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDeleteDialog.tier?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              subscription tier and remove it from your pricing options.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSaving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProducts;
