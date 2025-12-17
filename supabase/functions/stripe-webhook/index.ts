import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/**
 * Get the tier ID based on the Stripe price ID
 * Checks monthly, yearly, and lifetime price ID columns
 */
async function getTierIdByPriceId(priceId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('id')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId},stripe_price_id_lifetime.eq.${priceId}`)
    .single();

  if (error) {
    console.error("Error fetching tier by price ID:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Handle checkout.session.completed event
 * Creates or updates user subscription when checkout is complete
 * Supports both subscription mode and one-time payment mode (lifetime)
 * Handles both authenticated (user_id present) and unauthenticated (no user_id) checkouts
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log("Processing checkout.session.completed:", session.id, "mode:", session.mode);

  const userId = session.client_reference_id || session.metadata?.user_id;
  const customerId = session.customer as string;
  const isLifetime = session.metadata?.is_lifetime === 'true' || session.mode === 'payment';
  const customerEmail = session.customer_details?.email || session.customer_email;

  // Check if this is an authenticated or unauthenticated checkout
  if (!userId) {
    // UNAUTHENTICATED CHECKOUT: Create pending subscription entry
    console.log("Processing unauthenticated checkout - creating pending subscription");

    // Get the price ID from line items
    let priceId: string | undefined;
    let subscriptionId: string | null = null;

    if (isLifetime || session.mode === 'payment') {
      // For one-time payments, get price from line_items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      priceId = lineItems.data[0]?.price?.id;
    } else {
      // For subscriptions, get from subscription object
      subscriptionId = session.subscription as string;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        priceId = subscription.items.data[0]?.price.id;
      }
    }

    if (!priceId) {
      console.error("Could not find price ID for unauthenticated checkout");
      return;
    }

    // Get the tier ID
    const tierId = await getTierIdByPriceId(priceId);
    if (!tierId) {
      console.error("Could not find matching tier for price:", priceId);
      return;
    }

    // Create entry in pending_subscriptions table
    const { error: pendingError } = await supabase
      .from('pending_subscriptions')
      .insert({
        stripe_customer_id: customerId,
        stripe_session_id: session.id,
        stripe_subscription_id: subscriptionId,
        tier_id: tierId,
        customer_email: customerEmail || '',
        status: 'pending',
      });

    if (pendingError) {
      console.error("Error creating pending subscription:", pendingError);
      throw pendingError;
    }

    console.log("Successfully created pending subscription for session:", session.id, "email:", customerEmail);
    return;
  }

  // AUTHENTICATED CHECKOUT: Existing user upgrading subscription
  console.log("Processing authenticated checkout for user:", userId);

  if (isLifetime || session.mode === 'payment') {
    // Handle lifetime (one-time payment) purchase
    console.log("Processing lifetime purchase for user:", userId);

    // For payment mode, we need to get the price from line_items
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;

    if (!priceId) {
      console.error("Could not find price ID in line items for lifetime purchase");
      return;
    }

    // Get the tier ID based on the lifetime price
    const tierId = await getTierIdByPriceId(priceId);

    if (!tierId) {
      console.error("Could not find matching tier for lifetime price:", priceId);
      return;
    }

    // Set far-future expiration date for lifetime subscriptions
    const farFutureDate = '2099-12-31T23:59:59.000Z';

    // Upsert user subscription as lifetime
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier_id: tierId,
        stripe_subscription_id: null, // No recurring subscription for lifetime
        stripe_customer_id: customerId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: farFutureDate,
        cancel_at_period_end: false,
        is_lifetime: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error("Error upserting lifetime subscription:", error);
      throw error;
    }

    console.log("Successfully created lifetime subscription for user:", userId);
  } else {
    // Handle recurring subscription (existing logic)
    const subscriptionId = session.subscription as string;

    // Get the subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;

    // Get the tier ID based on the price
    const tierId = priceId ? await getTierIdByPriceId(priceId) : null;

    if (!tierId) {
      console.error("Could not find matching tier for price:", priceId);
      return;
    }

    // Upsert user subscription
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier_id: tierId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        is_lifetime: false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error("Error upserting subscription:", error);
      throw error;
    }

    console.log("Successfully created/updated subscription for user:", userId);
  }
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription status, period dates, cancellation status
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log("Processing customer.subscription.updated:", subscription.id);

  const userId = subscription.metadata?.user_id;
  const priceId = subscription.items.data[0]?.price.id;

  // Try to find existing subscription by Stripe subscription ID if no user_id in metadata
  let existingUserId = userId;
  if (!existingUserId) {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    existingUserId = data?.user_id;
  }

  if (!existingUserId) {
    console.error("No user ID found for subscription:", subscription.id);
    return;
  }

  // Get tier ID if price changed
  const tierId = priceId ? await getTierIdByPriceId(priceId) : null;

  const updateData: Record<string, any> = {
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  // Only update tier if we found a matching one
  if (tierId) {
    updateData.tier_id = tierId;
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  console.log("Successfully updated subscription:", subscription.id);
}

/**
 * Handle customer.subscription.deleted event
 * Sets subscription status to canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log("Processing customer.subscription.deleted:", subscription.id);

  // Get the Free tier to downgrade the user
  const { data: freeTier } = await supabase
    .from('subscription_tiers')
    .select('id')
    .eq('name', 'Free')
    .single();

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      tier_id: freeTier?.id, // Downgrade to Free tier
      stripe_subscription_id: null, // Clear the subscription ID
      cancel_at_period_end: false,
      is_lifetime: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error("Error handling subscription deletion:", error);
    throw error;
  }

  console.log("Successfully handled subscription deletion:", subscription.id);
}

/**
 * Handle charge.refunded event
 * Revokes access by setting status to refunded
 * Works for both recurring subscriptions and lifetime purchases
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  console.log("Processing charge.refunded:", charge.id);

  const customerId = charge.customer as string;

  if (!customerId) {
    console.error("No customer ID found in charge");
    return;
  }

  // Get the Free tier to downgrade the user
  const { data: freeTier } = await supabase
    .from('subscription_tiers')
    .select('id')
    .eq('name', 'Free')
    .single();

  // Find and update subscription by customer ID
  // This handles both lifetime and recurring subscriptions
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'refunded',
      tier_id: freeTier?.id, // Downgrade to Free tier
      is_lifetime: false, // Clear lifetime flag on refund
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error("Error handling refund:", error);
    throw error;
  }

  console.log("Successfully handled refund for customer:", customerId);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error("No Stripe signature found in request");
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Received Stripe webhook event:", event.type, event.id);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'invoice.payment_failed':
        // Handle payment failure - update status to past_due
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);
          console.log("Set subscription to past_due:", subscriptionId);
        }
        break;

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing webhook:", error);
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
