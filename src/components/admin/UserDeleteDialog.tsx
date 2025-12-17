import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import type { UserWithSubscription } from "@/components/admin/UserTable";

interface UserDeleteDialogProps {
  user: UserWithSubscription;
  currentUserId: string;
  onClose: () => void;
  onDelete: () => void;
}

/**
 * Confirmation dialog for deleting a user and all associated data.
 * Shows impact summary (email, funnel count) and prevents self-deletion.
 */
export const UserDeleteDialog = ({
  user,
  currentUserId,
  onClose,
  onDelete,
}: UserDeleteDialogProps) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const isSelfDeletion = user.id === currentUserId;
  const funnelCount = user.funnelCount ?? 0;

  const handleDelete = async () => {
    if (isSelfDeletion) {
      return;
    }

    setIsDeleting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ user_id: user.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast({
        title: "User deleted",
        description: result.message || `User ${user.email} has been permanently deleted`,
      });

      onDelete();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={() => !isDeleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete User
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isSelfDeletion ? (
                <p className="font-medium text-destructive">
                  You cannot delete your own account.
                </p>
              ) : (
                <>
                  <p>
                    Are you sure you want to permanently delete this user? This
                    action cannot be undone.
                  </p>

                  {/* Impact Summary */}
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <p className="font-medium text-foreground">
                      The following will be deleted:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>
                        User account: <strong>{user.email}</strong>
                      </li>
                      <li>
                        <strong>{funnelCount} {funnelCount === 1 ? 'funnel' : 'funnels'}</strong> and all associated data
                      </li>
                      <li>Subscription records</li>
                      <li>Profile information</li>
                      {user.id && (
                        <li>Admin privileges (if any)</li>
                      )}
                    </ul>
                  </div>

                  <p className="text-sm text-destructive font-medium">
                    This is a permanent action and all data will be lost.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || isSelfDeletion}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UserDeleteDialog;
