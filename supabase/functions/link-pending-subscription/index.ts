import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkSubscriptionRequest {
  session_id: string;
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, user_id }: LinkSubscriptionRequest = await req.json();

    // Validate required parameters
    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: session_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: user_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Linking pending subscription:", { session_id, user_id });

    // Look up the pending subscription by stripe_session_id
    const { data: pendingSubscription, error: lookupError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('stripe_session_id', session_id)
      .single();

    if (lookupError || !pendingSubscription) {
      console.error("Pending subscription not found:", lookupError);
      return new Response(
        JSON.stringify({ error: "Pending subscription not found for this session" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify status is 'pending' (not already linked)
    if (pendingSubscription.status !== 'pending') {
      console.error("Subscription already linked:", pendingSubscription.status);
      return new Response(
        JSON.stringify({ error: "Subscription has already been linked to an account" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if subscription has expired
    if (pendingSubscription.expires_at && new Date(pendingSubscription.expires_at) < new Date()) {
      console.error("Pending subscription has expired:", pendingSubscription.expires_at);
      return new Response(
        JSON.stringify({ error: "This subscription link has expired" }),
        {
          status: 410, // Gone
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create user_subscriptions entry with the pending subscription data
    // Determine if this is a lifetime subscription (no stripe_subscription_id means one-time payment)
    const isLifetime = !pendingSubscription.stripe_subscription_id;
    const farFutureDate = '2099-12-31T23:59:59.000Z';

    const { error: createError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user_id,
        tier_id: pendingSubscription.tier_id,
        stripe_subscription_id: pendingSubscription.stripe_subscription_id,
        stripe_customer_id: pendingSubscription.stripe_customer_id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: isLifetime ? farFutureDate : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days for subscriptions
        cancel_at_period_end: false,
        is_lifetime: isLifetime,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (createError) {
      console.error("Error creating user subscription:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create user subscription" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update pending_subscriptions: set linked_user_id, linked_at, status='linked'
    const { error: updateError } = await supabase
      .from('pending_subscriptions')
      .update({
        linked_user_id: user_id,
        linked_at: new Date().toISOString(),
        status: 'linked',
      })
      .eq('id', pendingSubscription.id);

    if (updateError) {
      console.error("Error updating pending subscription status:", updateError);
      // Don't fail the request since the subscription was created
      // Just log the error
    }

    console.log("Successfully linked subscription to user:", user_id, "tier:", pendingSubscription.tier_id);

    return new Response(
      JSON.stringify({
        success: true,
        tier_id: pendingSubscription.tier_id,
        is_lifetime: isLifetime,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error linking pending subscription:", error);
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
