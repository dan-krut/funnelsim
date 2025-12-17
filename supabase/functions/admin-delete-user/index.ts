import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the user from the JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if requesting user is an admin
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('is_admin')
      .eq('user_id', requestingUser.id)
      .eq('is_admin', true)
      .single();

    if (adminError || !adminRecord) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin privileges required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse request body
    const { user_id }: DeleteUserRequest = await req.json();

    // Validate required parameters
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: user_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Prevent self-deletion
    if (user_id === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Admin deleting user:", user_id, "by admin:", requestingUser.email);

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase.auth.admin.getUserById(user_id);

    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Delete in order: funnels, user_subscriptions, admin_users, profiles, auth.users

    // 1. Delete user's funnels
    const { error: funnelsError } = await supabase
      .from('funnels')
      .delete()
      .eq('user_id', user_id);

    if (funnelsError) {
      console.error("Error deleting funnels:", funnelsError);
      // Continue - funnels may not exist
    } else {
      console.log("Deleted user's funnels");
    }

    // 2. Delete user_subscriptions record
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user_id);

    if (subscriptionError) {
      console.error("Error deleting subscription:", subscriptionError);
      // Continue - subscription may not exist
    } else {
      console.log("Deleted user's subscription");
    }

    // 3. Delete admin_users record (if exists)
    const { error: adminDeleteError } = await supabase
      .from('admin_users')
      .delete()
      .eq('user_id', user_id);

    if (adminDeleteError) {
      console.error("Error deleting admin record:", adminDeleteError);
      // Continue - admin record may not exist
    } else {
      console.log("Deleted user's admin record");
    }

    // 4. Delete profiles record
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user_id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      // Continue - profile may not exist
    } else {
      console.log("Deleted user's profile");
    }

    // 5. Delete from auth.users using admin API
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${authDeleteError.message}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Successfully deleted user:", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${targetUser.user?.email || user_id} has been permanently deleted`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-delete-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
