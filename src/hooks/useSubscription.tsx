import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionTier, UserSubscription, BillingInterval } from "@/integrations/supabase/types";

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  tier: SubscriptionTier | null;
  isLoading: boolean;
  canCreateFunnel: boolean;
  funnelCount: number;
  funnelLimit: number;
  isUnlimited: boolean;
  isOverLimit: boolean;
  isLifetime: boolean;
  refreshSubscription: () => Promise<void>;
  initiateCheckout: (priceId: string, billingInterval?: BillingInterval) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [funnelCount, setFunnelCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscriptionData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch user's subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subscriptionError) {
        console.error('Error fetching subscription:', subscriptionError);
        setIsLoading(false);
        return;
      }

      setSubscription(subscriptionData);

      // If we have a subscription, fetch the tier details
      if (subscriptionData?.tier_id) {
        const { data: tierData, error: tierError } = await supabase
          .from('subscription_tiers')
          .select('*')
          .eq('id', subscriptionData.tier_id)
          .single();

        if (tierError) {
          console.error('Error fetching tier:', tierError);
        } else {
          setTier(tierData);
        }
      } else {
        // If no subscription, fetch the Free tier as default
        const { data: freeTier, error: freeTierError } = await supabase
          .from('subscription_tiers')
          .select('*')
          .eq('name', 'Free')
          .single();

        if (!freeTierError && freeTier) {
          setTier(freeTier);
        }
      }

      // Fetch funnel count
      const { count, error: countError } = await supabase
        .from('funnels')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error fetching funnel count:', countError);
      } else {
        setFunnelCount(count || 0);
      }
    } catch (error) {
      console.error('Error in fetchSubscriptionData:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const refreshSubscription = async () => {
    await fetchSubscriptionData();
  };

  const initiateCheckout = async (priceId: string, billingInterval: BillingInterval = 'monthly') => {
    if (!user?.id || !user?.email) {
      throw new Error('User must be logged in to initiate checkout');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const successUrl = `${window.location.origin}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}/profile?checkout=canceled`;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        user_id: user.id,
        user_email: user.email,
        success_url: successUrl,
        cancel_url: cancelUrl,
        billing_interval: billingInterval,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const { url } = await response.json();

    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned');
    }
  };

  const openCustomerPortal = async () => {
    if (!subscription?.stripe_customer_id) {
      throw new Error('No Stripe customer ID found');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const returnUrl = `${window.location.origin}/profile`;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        customer_id: subscription.stripe_customer_id,
        return_url: returnUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create portal session');
    }

    const { url } = await response.json();

    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No portal URL returned');
    }
  };

  // Calculate derived values
  // max_funnels = -1 means unlimited
  const funnelLimit = tier?.max_funnels ?? 3; // Default to 3 (Free tier limit)
  const isUnlimited = funnelLimit === -1;
  // canCreateFunnel is true if unlimited OR if below limit
  const canCreateFunnel = isUnlimited || funnelCount < funnelLimit;
  // isOverLimit is true when user has more funnels than their current limit allows
  // This can happen after a downgrade
  const isOverLimit = !isUnlimited && funnelCount > funnelLimit;
  // isLifetime is true when user has a lifetime (one-time payment) subscription
  const isLifetime = subscription?.is_lifetime === true;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        tier,
        isLoading,
        canCreateFunnel,
        funnelCount,
        funnelLimit,
        isUnlimited,
        isOverLimit,
        isLifetime,
        refreshSubscription,
        initiateCheckout,
        openCustomerPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
