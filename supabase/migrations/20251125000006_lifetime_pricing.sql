-- Add lifetime pricing support to subscription system
-- Migration: 20251125000006_lifetime_pricing.sql

-- Add lifetime pricing columns to subscription_tiers table
ALTER TABLE public.subscription_tiers
ADD COLUMN IF NOT EXISTS stripe_price_id_lifetime text,
ADD COLUMN IF NOT EXISTS price_lifetime numeric(10, 2) NOT NULL DEFAULT 0;

-- Add is_lifetime column to user_subscriptions table
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.subscription_tiers.stripe_price_id_lifetime IS 'Stripe Price ID for one-time lifetime payment';
COMMENT ON COLUMN public.subscription_tiers.price_lifetime IS 'Display price for lifetime purchase option';
COMMENT ON COLUMN public.user_subscriptions.is_lifetime IS 'True if this is a lifetime (one-time payment) subscription';
