import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Zap, ExternalLink, Infinity } from "lucide-react";
import { format } from "date-fns";
import type { SubscriptionTier, UserSubscription } from "@/integrations/supabase/types";
import { FunnelUsage } from "./FunnelUsage";

interface SubscriptionCardProps {
  tier: SubscriptionTier | null;
  subscription: UserSubscription | null;
  funnelCount: number;
  onUpgrade: () => void;
  onManage: () => void;
  isLoading?: boolean;
}

export const SubscriptionCard = ({
  tier,
  subscription,
  funnelCount,
  onUpgrade,
  onManage,
  isLoading = false,
}: SubscriptionCardProps) => {
  const isFreeTier = tier?.price_monthly === 0;
  const isLifetime = subscription?.is_lifetime === true;
  // isPaidTier now includes lifetime subscriptions (they have no stripe_subscription_id but are paid)
  const isPaidTier = !isFreeTier && (subscription?.stripe_subscription_id || isLifetime);
  const isCanceling = subscription?.cancel_at_period_end && !isLifetime;

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `$${price}/mo`;
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    // Check lifetime first - distinct styling with purple/indigo
    if (isLifetime) {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
          Lifetime
        </Badge>
      );
    }

    // Show canceling status
    if (isCanceling) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
          Canceling
        </Badge>
      );
    }

    const status = subscription.status;

    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            Active
          </Badge>
        );
      case "past_due":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
            Past Due
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
            Canceled
          </Badge>
        );
      case "refunded":
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
            Refunded
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Loading subscription details...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">{tier?.name || "Free"}</span>
              <span className="text-lg text-muted-foreground">
                {isLifetime ? (
                  <span className="flex items-center gap-1">
                    <Infinity className="h-4 w-4" />
                    Lifetime
                  </span>
                ) : (
                  formatPrice(tier?.price_monthly || 0)
                )}
              </span>
            </div>
          </div>
          {isPaidTier && (
            isLifetime ? (
              <Infinity className="h-5 w-5 text-purple-500" />
            ) : (
              <Zap className="h-5 w-5 text-primary" />
            )
          )}
        </div>

        {/* Billing Period - only for recurring paid subscriptions, not lifetime */}
        {isPaidTier && !isLifetime && subscription?.current_period_end && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {isCanceling ? "Access until: " : "Renews: "}
              {format(new Date(subscription.current_period_end), "MMMM d, yyyy")}
            </span>
          </div>
        )}

        {/* Lifetime access message - replaces renewal date for lifetime users */}
        {isLifetime && (
          <div className="flex items-center gap-3 text-sm text-purple-600 dark:text-purple-400">
            <Infinity className="h-4 w-4" />
            <span>Lifetime access - never expires</span>
          </div>
        )}

        {/* Funnel Usage */}
        <FunnelUsage funnelCount={funnelCount} funnelLimit={tier?.max_funnels || 3} />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {isFreeTier ? (
            <Button onClick={onUpgrade} className="flex-1">
              <Zap className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          ) : isLifetime ? (
            // Lifetime users can still contact support if needed
            <Button onClick={onManage} variant="outline" className="flex-1">
              <ExternalLink className="mr-2 h-4 w-4" />
              Billing History
            </Button>
          ) : (
            <Button onClick={onManage} variant="outline" className="flex-1">
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Subscription
            </Button>
          )}
        </div>

        {/* Upgrade prompt for paid users who want higher tier (not for lifetime users on Enterprise) */}
        {isPaidTier && tier?.name !== "Enterprise" && !isLifetime && (
          <Button onClick={onUpgrade} variant="ghost" size="sm" className="w-full text-muted-foreground">
            Need more funnels? Upgrade to Enterprise
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
