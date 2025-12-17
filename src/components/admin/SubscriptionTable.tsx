import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { SubscriptionTier, UserSubscription } from "@/integrations/supabase/types";

interface UserInfo {
  id: string;
  email: string | null;
}

interface SubscriptionTableProps {
  subscriptions: UserSubscription[];
  tiers: SubscriptionTier[];
  users: UserInfo[];
  isLoading?: boolean;
}

/**
 * Reusable table component for displaying subscription listings.
 * Features status badges (color-coded) and links to Stripe dashboard.
 */
export const SubscriptionTable = ({
  subscriptions,
  tiers,
  users,
  isLoading = false,
}: SubscriptionTableProps) => {
  const getTierName = (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    return tier?.name || 'Unknown';
  };

  const getUserEmail = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.email || 'Unknown';
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'canceled':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
      case 'past_due':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'refunded':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'trialing':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading subscriptions...
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No subscriptions found.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Period End</TableHead>
            <TableHead>Auto-Renew</TableHead>
            <TableHead>Stripe ID</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((subscription) => (
            <TableRow key={subscription.id}>
              <TableCell className="font-medium">
                {getUserEmail(subscription.user_id)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getTierName(subscription.tier_id)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={getStatusBadgeClasses(subscription.status)}
                >
                  {subscription.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {subscription.current_period_end
                  ? format(new Date(subscription.current_period_end), 'MMM d, yyyy')
                  : 'N/A'}
              </TableCell>
              <TableCell>
                {subscription.cancel_at_period_end ? (
                  <Badge variant="outline" className="text-orange-600">
                    Will Cancel
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600">
                    Active
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">
                {subscription.stripe_subscription_id
                  ? subscription.stripe_subscription_id.slice(0, 20) + '...'
                  : 'N/A'}
              </TableCell>
              <TableCell>
                {subscription.stripe_subscription_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    title="View in Stripe"
                  >
                    <a
                      href={`https://dashboard.stripe.com/subscriptions/${subscription.stripe_subscription_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SubscriptionTable;
