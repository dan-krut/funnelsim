import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutSessionRequest {
  price_id: string;
  user_id?: string;        // Optional: not provided for unauthenticated checkout
  user_email?: string;     // Optional: not provided for unauthenticated checkout
  success_url?: string;
  cancel_url?: string;
  billing_interval?: 'monthly' | 'yearly' | 'lifetime';
  origin?: string;         // Optional: the origin URL for redirects (e.g., https://example.com)
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      price_id,
      user_id,
      user_email,
      success_url,
      cancel_url,
      billing_interval = 'monthly',
      origin
    }: CheckoutSessionRequest = await req.json();

    // Determine base URL from origin parameter or fall back to environment/default
    const siteUrl = origin || Deno.env.get('SITE_URL') || 'https://funnelsim.app';

    // Determine if this is an authenticated (existing user upgrade) or unauthenticated (new user) checkout
    const isAuthenticated = Boolean(user_id && user_email);

    console.log("Creating checkout session:", {
      authenticated: isAuthenticated,
      user_id: user_id || 'none',
      price_id,
      billing_interval
    });

    // Validate required parameter (only price_id is required for both flows)
    if (!price_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: price_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Determine if this is a lifetime (one-time payment) or subscription
    const isLifetime = billing_interval === 'lifetime';

    let customerId: string | undefined;
    let finalSuccessUrl: string;
    let finalCancelUrl: string;

    if (isAuthenticated) {
      // AUTHENTICATED FLOW: Existing user upgrading subscription
      // Check if user already has a Stripe customer ID
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user_id)
        .single();

      customerId = existingSubscription?.stripe_customer_id;

      // If no existing customer, create one
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user_email,
          metadata: {
            user_id: user_id!,
          },
        });
        customerId = customer.id;
        console.log("Created new Stripe customer for authenticated user:", customerId);
      }

      // Use provided URLs or fall back to siteUrl with profile page
      finalSuccessUrl = success_url || `${siteUrl}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      finalCancelUrl = cancel_url || `${siteUrl}/profile?checkout=canceled`;
    } else {
      // UNAUTHENTICATED FLOW: New user purchasing before account creation
      // Do not create Stripe customer upfront - let Stripe Checkout create one
      customerId = undefined;

      // Set URLs for unauthenticated checkout flow using origin
      finalSuccessUrl = `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      finalCancelUrl = `${siteUrl}/`;

      console.log("Unauthenticated checkout - customer will be created by Stripe, redirecting to:", siteUrl);
    }

    // Create Stripe Checkout Session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: isLifetime ? 'payment' : 'subscription',
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        billing_interval: billing_interval,
        is_lifetime: isLifetime ? 'true' : 'false',
      },
    };

    // Set customer for authenticated flow only
    if (customerId) {
      sessionConfig.customer = customerId;
    }

    // Set client_reference_id and user_id metadata only when authenticated
    if (isAuthenticated && user_id) {
      sessionConfig.client_reference_id = user_id;
      sessionConfig.metadata!.user_id = user_id;

      // Only add subscription_data for recurring subscriptions with authenticated users
      if (!isLifetime) {
        sessionConfig.subscription_data = {
          metadata: {
            user_id: user_id,
          },
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log("Created checkout session:", session.id, "mode:", session.mode, "authenticated:", isAuthenticated);

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
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
