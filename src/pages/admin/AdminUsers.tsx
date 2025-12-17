import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Search, X, RefreshCw, UserPlus, Loader2 } from "lucide-react";
import { UserTable } from "@/components/admin/UserTable";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { UserDeleteDialog } from "@/components/admin/UserDeleteDialog";
import type { UserWithSubscription } from "@/components/admin/UserTable";
import type { SubscriptionTier } from "@/integrations/supabase/types";

const ITEMS_PER_PAGE = 20;

/**
 * Admin users page for managing user accounts.
 * Features user list with pagination, search/filter, admin status toggle,
 * and edit/delete functionality.
 */
export const AdminUsers = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [adminUserIds, setAdminUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");

  // Add User dialog state
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserMakeAdmin, setNewUserMakeAdmin] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit/Delete dialog state
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tiers on mount
  useEffect(() => {
    fetchTiers();
    fetchAdminUsers();
  }, []);

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, filterTier]);

  const fetchTiers = async () => {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setTiers(data);
    }
  };

  const fetchAdminUsers = async () => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('is_admin', true);

    if (!error && data) {
      setAdminUserIds(data.map((a) => a.user_id));
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);

    try {
      // Build query for profiles with search
      let profileQuery = supabase
        .from('profiles')
        .select('id, email, created_at', { count: 'exact' });

      if (debouncedSearch) {
        profileQuery = profileQuery.ilike('email', `%${debouncedSearch}%`);
      }

      // Apply pagination
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      profileQuery = profileQuery.range(from, to).order('created_at', { ascending: false });

      const { data: profiles, count, error: profileError } = await profileQuery;

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        toast({
          title: "Error loading users",
          description: profileError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setTotalCount(count || 0);

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      // Get user IDs
      const userIds = profiles.map((p) => p.id);

      // Fetch subscriptions for these users
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('*')
        .in('user_id', userIds);

      // Fetch funnel counts for these users
      const { data: funnelCounts } = await supabase
        .from('funnels')
        .select('user_id')
        .in('user_id', userIds);

      // Count funnels per user
      const funnelCountMap: Record<string, number> = {};
      funnelCounts?.forEach((f) => {
        funnelCountMap[f.user_id] = (funnelCountMap[f.user_id] || 0) + 1;
      });

      // Create subscription map
      const subscriptionMap: Record<string, any> = {};
      subscriptions?.forEach((s) => {
        subscriptionMap[s.user_id] = s;
      });

      // Combine data
      let usersWithData: UserWithSubscription[] = profiles.map((profile) => ({
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at,
        subscription: subscriptionMap[profile.id] || null,
        funnelCount: funnelCountMap[profile.id] || 0,
      }));

      // Filter by tier if specified
      if (filterTier !== "all") {
        const tierRecord = tiers.find((t) => t.name === filterTier);
        if (tierRecord) {
          usersWithData = usersWithData.filter(
            (u) => u.subscription?.tier_id === tierRecord.id
          );
        }
      }

      setUsers(usersWithData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error loading users",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filterTier, tiers, toast]);

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      if (isAdmin) {
        // Add admin record
        const { error } = await supabase
          .from('admin_users')
          .upsert({ user_id: userId, is_admin: true }, { onConflict: 'user_id' });

        if (error) throw error;

        setAdminUserIds((prev) => [...prev, userId]);
        toast({
          title: "Admin status updated",
          description: "User has been granted admin privileges",
        });
      } else {
        // Remove admin record
        const { error } = await supabase
          .from('admin_users')
          .update({ is_admin: false })
          .eq('user_id', userId);

        if (error) throw error;

        setAdminUserIds((prev) => prev.filter((id) => id !== userId));
        toast({
          title: "Admin status updated",
          description: "Admin privileges have been revoked",
        });
      }
    } catch (error: any) {
      console.error('Error toggling admin status:', error);
      toast({
        title: "Error updating admin status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleRefresh = () => {
    fetchUsers();
    fetchAdminUsers();
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Validation Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingUser(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: newUserEmail,
            password: newUserPassword,
            make_admin: newUserMakeAdmin,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }

      toast({
        title: "User Created",
        description: result.message,
      });

      // Reset form and close dialog
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserMakeAdmin(false);
      setAddUserOpen(false);

      // Refresh user list
      fetchUsers();
      fetchAdminUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Edit/Delete handlers
  const handleEditUser = (user: UserWithSubscription) => {
    setSelectedUser(user);
    setDialogMode('edit');
  };

  const handleDeleteUser = (user: UserWithSubscription) => {
    setSelectedUser(user);
    setDialogMode('delete');
  };

  const handleCloseDialog = () => {
    setSelectedUser(null);
    setDialogMode(null);
  };

  const handleSaveEdit = () => {
    handleCloseDialog();
    // Refresh user list after edit
    fetchUsers();
  };

  const handleConfirmDelete = () => {
    handleCloseDialog();
    // Refresh user list after delete
    fetchUsers();
    fetchAdminUsers();
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasMore = page < totalPages - 1;
  const hasPrevious = page > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and admin privileges
          </p>
        </div>

        {/* Add User Dialog */}
        <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account. The user will be able to login immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="makeAdmin"
                  checked={newUserMakeAdmin}
                  onCheckedChange={(checked) => setNewUserMakeAdmin(checked === true)}
                />
                <Label htmlFor="makeAdmin" className="text-sm font-normal">
                  Grant admin privileges
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                {isCreatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by email..."
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

            {/* Tier Filter */}
            <Select value={filterTier} onValueChange={(value) => { setFilterTier(value); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {tiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.name}>
                    {tier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading...'
              : `Showing ${users.length} of ${totalCount} users`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <UserTable
                users={users}
                tiers={tiers}
                onToggleAdmin={handleToggleAdmin}
                adminUserIds={adminUserIds}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
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
                      disabled={!hasPrevious}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {selectedUser && dialogMode === 'edit' && (
        <UserEditDialog
          user={selectedUser}
          tiers={tiers}
          onClose={handleCloseDialog}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Dialog */}
      {selectedUser && dialogMode === 'delete' && currentUser && (
        <UserDeleteDialog
          user={selectedUser}
          currentUserId={currentUser.id}
          onClose={handleCloseDialog}
          onDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default AdminUsers;
