import React, { useState, useEffect } from 'react';
import { Quote, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { useWhitelabel, DEFAULT_TESTIMONIALS } from '@/hooks/useWhitelabel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionTier } from '@/integrations/supabase/types';

// Default pricing plans (fallback when no tiers in database)
const DEFAULT_PLANS = [
  {
    name: "Starter",
    price: "0",
    description: "Perfect for solo marketers testing ideas.",
    features: ["3 Active Funnels", "Basic Analytics", "Export to PNG", "Standard Nodes"],
    cta: "Start Free",
    featured: false,
    priceId: null,
  },
  {
    name: "Pro",
    price: "29",
    description: "For agencies and power users scaling up.",
    features: ["Unlimited Funnels", "Advanced ROI Calculation", "Team Sharing", "Prioritized Support", "White-label Exports"],
    cta: "Start Trial",
    featured: true,
    priceId: null,
  },
];

interface PlanType {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
  priceId: string | null;
}

export const Testimonials: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { config, isLoading: configLoading } = useWhitelabel();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Fetch subscription tiers from database
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_tiers')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching tiers:', error);
        } else if (data) {
          setTiers(data);
        }
      } catch (err) {
        console.error('Error in fetchTiers:', err);
      } finally {
        setTiersLoading(false);
      }
    };

    fetchTiers();
  }, []);

  // Use whitelabel testimonials or defaults
  const testimonials = config.testimonials && config.testimonials.length > 0
    ? config.testimonials
    : DEFAULT_TESTIMONIALS;

  // Only show content once loaded - no flash of default content (FOUC)
  const dataLoading = tiersLoading || configLoading;

  // Build plans from database tiers or use defaults
  const plans: PlanType[] = tiers.length > 0
    ? tiers.map((tier, index) => {
        // Parse features from JSONB
        let features: string[] = [];
        try {
          if (tier.features) {
            const parsed = typeof tier.features === 'string'
              ? JSON.parse(tier.features)
              : tier.features;
            if (Array.isArray(parsed)) {
              features = parsed;
            }
          }
        } catch {
          features = [];
        }

        return {
          name: tier.name,
          price: tier.price_monthly.toString(),
          description: index === 0
            ? "Perfect for solo marketers testing ideas."
            : index === 1
            ? "For agencies and power users scaling up."
            : "Enterprise-grade features for teams.",
          features: features.length > 0
            ? features
            : [`${tier.max_funnels === -1 ? 'Unlimited' : tier.max_funnels} Funnels`],
          cta: tier.price_monthly === 0 ? "Start Free" : "Get Started",
          featured: index === 1, // Middle tier is featured
          priceId: tier.stripe_price_id_monthly,
        };
      })
    : DEFAULT_PLANS;

  const handlePlanClick = async (plan: PlanType) => {
    // Free plan - just go to auth or dashboard
    if (!plan.priceId || plan.price === "0") {
      navigate(user ? '/dashboard' : '/auth');
      return;
    }

    // Paid plan - initiate checkout
    // For logged-in users, redirect to profile to use the existing authenticated checkout flow
    if (user) {
      // Store priceId for checkout after navigating to profile
      localStorage.setItem('pendingCheckoutPriceId', plan.priceId);
      navigate('/profile?initCheckout=true');
      return;
    }

    // For unauthenticated users - call create-checkout-session directly
    setCheckoutLoading(plan.priceId);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lntraljilztlwwsggtfa.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            price_id: plan.priceId,
            origin: window.location.origin,
            // No user_id or user_email - unauthenticated checkout
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast({
        variant: 'destructive',
        title: 'Checkout Error',
        description: error.message || 'Failed to initiate checkout. Please try again.',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
       {/* Shared Background elements for both Testimonials and Pricing */}
       <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -z-10"></div>
       <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-violet-600/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* --- TESTIMONIALS PART --- */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
            Loved by Top <span className="text-indigo-400">Marketers</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-32">
          {dataLoading ? (
            // Skeleton loaders for testimonials
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-dark-800/40 border border-white/5 p-8 rounded-2xl animate-pulse">
                <div className="h-24 bg-white/5 rounded mb-8"></div>
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-white/5"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-white/5 rounded"></div>
                    <div className="h-3 w-16 bg-white/5 rounded"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            testimonials.map((t, i) => (
              <div key={i} className="bg-dark-800/40 border border-white/5 p-8 rounded-2xl relative group hover:bg-dark-800/60 transition-colors">
                <Quote className="absolute top-6 right-6 w-8 h-8 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors" />

                <p className="text-slate-300 leading-relaxed mb-8 relative z-10">
                  "{t.quote}"
                </p>

                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 overflow-hidden">
                      {/* Using colored placeholder if image fails, or actual image */}
                     {t.image ? (
                       <img
                         src={t.image}
                         alt={t.author}
                         className="w-full h-full object-cover opacity-80"
                         onError={(e) => {
                           (e.target as HTMLImageElement).style.display = 'none';
                         }}
                       />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-indigo-400 font-bold">
                         {t.author.charAt(0)}
                       </div>
                     )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{t.author}</h4>
                    {t.role && <p className="text-indigo-400 text-xs">{t.role}</p>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- PRICING PART (Merged into same section) --- */}
        <div id="pricing">
            <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400">
                Start for free. Upgrade when you need to manage more funnels.
            </p>
            </div>

            {dataLoading ? (
              // Skeleton loaders for pricing cards
              <div className="grid gap-8 max-w-4xl mx-auto md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-8 rounded-2xl border border-white/5 animate-pulse">
                    <div className="mb-8">
                      <div className="h-5 w-20 bg-white/5 rounded mb-4"></div>
                      <div className="h-10 w-32 bg-white/5 rounded mb-4"></div>
                      <div className="h-4 w-48 bg-white/5 rounded"></div>
                    </div>
                    <div className="space-y-4 mb-8">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="h-4 bg-white/5 rounded w-3/4"></div>
                      ))}
                    </div>
                    <div className="h-12 bg-white/5 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`grid gap-8 max-w-4xl mx-auto ${plans.length === 2 ? 'md:grid-cols-2' : plans.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
              {plans.map((plan, idx) => {
                  const isCheckingOut = checkoutLoading !== null && checkoutLoading === plan.priceId;
                  return (
                  <div
                  key={idx}
                  className={`relative p-8 rounded-2xl border flex flex-col transition-all duration-300 ${
                      plan.featured
                      ? 'bg-white/[0.02] border-indigo-500/30 shadow-2xl shadow-indigo-500/10 backdrop-blur-sm'
                      : 'bg-transparent border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
                  }`}
                  >
                  {plan.featured && (
                      <>
                      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none rounded-2xl"></div>
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-lg shadow-indigo-500/20">
                          Most Popular
                      </div>
                      </>
                  )}

                  <div className="mb-8 relative z-10">
                      <h3 className="text-lg font-medium text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline text-white">
                      <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                      <span className="text-slate-500 ml-2">/month</span>
                      </div>
                      <p className="text-slate-400 mt-4 text-sm">{plan.description}</p>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1 relative z-10">
                      {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center text-slate-300 text-sm">
                          <Check className="w-4 h-4 text-indigo-400 mr-3 shrink-0" />
                          {feat}
                      </li>
                      ))}
                  </ul>

                  <Button
                      variant={plan.featured ? 'primary' : 'outline'}
                      className="w-full relative z-10"
                      onClick={() => handlePlanClick(plan)}
                      disabled={isCheckingOut}
                  >
                      {isCheckingOut ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        plan.cta
                      )}
                  </Button>
                  </div>
              )})}
              </div>
            )}
        </div>
      </div>
    </section>
  );
};
