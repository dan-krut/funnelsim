import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseAdminReturn {
  /** Whether the current user has admin privileges */
  isAdmin: boolean;
  /** Whether the admin status is still being loaded */
  isLoading: boolean;
  /** Refresh the admin status from the database */
  refreshAdminStatus: () => Promise<void>;
}

/**
 * Hook to check if the current user has admin privileges.
 * Queries the `admin_users` table to determine admin status.
 *
 * @returns Object containing isAdmin status and loading state
 *
 * @example
 * ```tsx
 * const { isAdmin, isLoading } = useAdmin();
 *
 * if (isLoading) return <Spinner />;
 * if (!isAdmin) return <Navigate to="/dashboard" />;
 *
 * return <AdminDashboard />;
 * ```
 */
export const useAdmin = (): UseAdminReturn => {
  const { user, session, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedRef = useRef(false);

  const checkAdminStatus = useCallback(async () => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Need both user and session for authenticated requests
    if (!user?.id || !session) {
      setIsAdmin(false);
      setIsLoading(false);
      hasCheckedRef.current = true;
      return;
    }

    try {
      // Only show loading on initial check, not on re-checks (e.g., tab focus)
      if (!hasCheckedRef.current) {
        setIsLoading(true);
      }

      // Query the admin_users table for the current user
      const { data, error } = await supabase
        .from('admin_users')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        // User is admin if they have a record with is_admin = true
        setIsAdmin(data?.is_admin === true);
      }
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
      hasCheckedRef.current = true;
    }
  }, [user?.id, session, authLoading]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const refreshAdminStatus = async () => {
    await checkAdminStatus();
  };

  return {
    isAdmin,
    isLoading,
    refreshAdminStatus,
  };
};

export default useAdmin;
