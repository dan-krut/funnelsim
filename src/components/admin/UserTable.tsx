import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Shield,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import type { SubscriptionTier, UserSubscription } from "@/integrations/supabase/types";

export interface UserWithSubscription {
  id: string;
  email: string | null;
  created_at: string | null;
  subscription?: UserSubscription | null;
  funnelCount?: number;
}

interface UserTableProps {
  users: UserWithSubscription[];
  tiers: SubscriptionTier[];
  onToggleAdmin: (userId: string, isAdmin: boolean) => void;
  adminUserIds: string[];
  isLoading?: boolean;
  onEdit?: (user: UserWithSubscription) => void;
  onDelete?: (user: UserWithSubscription) => void;
}

type SortField = 'email' | 'created_at' | 'tier' | 'status' | 'funnels';
type SortDirection = 'asc' | 'desc';

/**
 * Reusable table component for displaying user listings in the admin area.
 * Features sortable columns, status badges, admin toggle, and edit/delete actions.
 */
export const UserTable = ({
  users,
  tiers,
  onToggleAdmin,
  adminUserIds,
  isLoading = false,
  onEdit,
  onDelete,
}: UserTableProps) => {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getTierName = (tierId: string | undefined) => {
    if (!tierId) return 'Free';
    const tier = tiers.find((t) => t.id === tierId);
    return tier?.name || 'Unknown';
  };

  const getStatusBadgeVariant = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'canceled':
        return 'secondary';
      case 'past_due':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  const sortedUsers = [...users].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    switch (sortField) {
      case 'email':
        return (a.email || '').localeCompare(b.email || '') * direction;
      case 'created_at':
        return (
          (new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()) *
          direction
        );
      case 'tier':
        return (
          getTierName(a.subscription?.tier_id).localeCompare(
            getTierName(b.subscription?.tier_id)
          ) * direction
        );
      case 'status':
        return (
          (a.subscription?.status || '').localeCompare(
            b.subscription?.status || ''
          ) * direction
        );
      case 'funnels':
        return ((a.funnelCount || 0) - (b.funnelCount || 0)) * direction;
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading users...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No users found.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('email')}
              >
                Email
                {getSortIcon('email')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('tier')}
              >
                Tier
                {getSortIcon('tier')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('status')}
              >
                Status
                {getSortIcon('status')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('funnels')}
              >
                Funnels
                {getSortIcon('funnels')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('created_at')}
              >
                Joined
                {getSortIcon('created_at')}
              </Button>
            </TableHead>
            <TableHead>Admin</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedUsers.map((user) => {
            const isUserAdmin = adminUserIds.includes(user.id);

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.email}
                    {isUserAdmin && (
                      <Shield className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getTierName(user.subscription?.tier_id)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.subscription?.status)}>
                    {user.subscription?.status || 'active'}
                  </Badge>
                </TableCell>
                <TableCell>{user.funnelCount ?? 0}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.created_at
                    ? format(new Date(user.created_at), 'MMM d, yyyy')
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={isUserAdmin}
                    onCheckedChange={(checked) => onToggleAdmin(user.id, checked)}
                    aria-label={`Toggle admin status for ${user.email}`}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${user.email}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {user.subscription?.stripe_customer_id && (
                        <DropdownMenuItem asChild>
                          <a
                            href={`https://dashboard.stripe.com/customers/${user.subscription.stripe_customer_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View in Stripe
                          </a>
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
