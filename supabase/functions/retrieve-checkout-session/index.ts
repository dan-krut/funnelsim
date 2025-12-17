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

interface RetrieveSessionRequest {
  session_id: string;
}

interface RetrieveSessionResponse {
  customer_email: string | null;
  payment_status: string;
  subscription_id: string | null;
  tier_name: string | null;
  tier_id: string | null;
}

/**
 * Get the tier info based on the Stripe price ID
 * Checks monthly, yearly, and lifetime price ID columns
 */
async function getTierByPriceId(priceId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('id, name')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId},stripe_price_id_lifetime.eq.${priceId}`)
    .single();

  if (error) {
    console.error("Error fetching tier by price ID:", error);
    return null;
  }

  return data || null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id }: RetrieveSessionRequest = await req.json();

    // Validate session_id parameter
    if (!session_id || session_id.trim() === '') {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: session_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Retrieving checkout session:", session_id);

    // Retrieve the checkout session from Stripe
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch (stripeError: any) {
      console.error("Stripe API error retrieving session:", stripeError.message);
      return new Response(
        JSON.stringify({ error: `Invalid session_id: ${stripeError.message}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the line items to find the price ID
    let priceId: string | undefined;
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session_id);
      priceId = lineItems.data[0]?.price?.id;
    } catch (lineItemError: any) {
      console.error("Error fetching line items:", lineItemError.message);
      // Continue without price info - not critical
    }

    // Look up the tier information if we have a price ID
    let tier: { id: string; name: string } | null = null;
    if (priceId) {
      tier = await getTierByPriceId(priceId);
    }

    // Build the response
    const response: RetrieveSessionResponse = {
      customer_email: session.customer_details?.email || session.customer_email || null,
      payment_status: session.payment_status || 'unknown',
      subscription_id: (session.subscription as string) || null,
      tier_name: tier?.name || null,
      tier_id: tier?.id || null,
    };

    console.log("Retrieved session data:", {
      session_id,
      payment_status: response.payment_status,
      tier_name: response.tier_name,
      has_email: !!response.customer_email,
    });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error retrieving checkout session:", error);
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
