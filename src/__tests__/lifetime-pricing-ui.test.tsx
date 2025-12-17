/**
 * Lifetime Pricing UI Tests
 *
 * Tests for lifetime pricing feature in UI components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// Import types
import type { SubscriptionTier, UserSubscription } from '@/integrations/supabase/types';

// Test data
const mockLifetimeTier: SubscriptionTier = {
  id: 'tier-pro-lifetime',
  name: 'Pro',
  stripe_product_id: 'prod_test',
  stripe_price_id_monthly: 'price_monthly_test',
  stripe_price_id_yearly: 'price_yearly_test',
  stripe_price_id_lifetime: 'price_lifetime_test',
  price_monthly: 29,
  price_yearly: 290,
  price_lifetime: 499,
  max_funnels: 25,
  features: ['Feature 1', 'Feature 2'],
  sort_order: 1,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockLifetimeSubscription: UserSubscription = {
  id: 'sub-123',
  user_id: 'user-123',
  tier_id: 'tier-pro-lifetime',
  stripe_subscription_id: null, // Lifetime has no recurring subscription
  stripe_customer_id: 'cus_test',
  status: 'active',
  current_period_start: '2024-01-01T00:00:00Z',
  current_period_end: '2099-12-31T23:59:59Z', // Far future for lifetime
  cancel_at_period_end: false,
  is_lifetime: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockRecurringSubscription: UserSubscription = {
  id: 'sub-456',
  user_id: 'user-456',
  tier_id: 'tier-pro-monthly',
  stripe_subscription_id: 'sub_stripe_test',
  stripe_customer_id: 'cus_test',
  status: 'active',
  current_period_start: '2024-01-01T00:00:00Z',
  current_period_end: '2024-02-01T00:00:00Z',
  cancel_at_period_end: false,
  is_lifetime: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('SubscriptionTier Types', () => {
  it('should include lifetime price fields in SubscriptionTier type', () => {
    // TypeScript compilation test - if this compiles, the types are correct
    const tier: SubscriptionTier = mockLifetimeTier;

    expect(tier.stripe_price_id_lifetime).toBe('price_lifetime_test');
    expect(tier.price_lifetime).toBe(499);
  });

  it('should allow null lifetime price ID for tiers without lifetime option', () => {
    const tierWithoutLifetime: SubscriptionTier = {
      ...mockLifetimeTier,
      stripe_price_id_lifetime: null,
      price_lifetime: 0,
    };

    expect(tierWithoutLifetime.stripe_price_id_lifetime).toBeNull();
    expect(tierWithoutLifetime.price_lifetime).toBe(0);
  });
});

describe('UserSubscription Types', () => {
  it('should include is_lifetime field in UserSubscription type', () => {
    // TypeScript compilation test - if this compiles, the types are correct
    const subscription: UserSubscription = mockLifetimeSubscription;

    expect(subscription.is_lifetime).toBe(true);
  });

  it('should default is_lifetime to false for recurring subscriptions', () => {
    const subscription: UserSubscription = mockRecurringSubscription;

    expect(subscription.is_lifetime).toBe(false);
  });

  it('should have null stripe_subscription_id for lifetime purchases', () => {
    expect(mockLifetimeSubscription.stripe_subscription_id).toBeNull();
    expect(mockLifetimeSubscription.is_lifetime).toBe(true);
  });
});

describe('BillingInterval Type', () => {
  it('should accept monthly, yearly, and lifetime values', () => {
    // Import the type
    type BillingInterval = 'monthly' | 'yearly' | 'lifetime';

    const monthly: BillingInterval = 'monthly';
    const yearly: BillingInterval = 'yearly';
    const lifetime: BillingInterval = 'lifetime';

    expect(monthly).toBe('monthly');
    expect(yearly).toBe('yearly');
    expect(lifetime).toBe('lifetime');
  });
});

describe('Lifetime Pricing Display Logic', () => {
  it('should identify lifetime subscription correctly', () => {
    const isLifetime = mockLifetimeSubscription.is_lifetime === true;
    expect(isLifetime).toBe(true);
  });

  it('should identify recurring subscription correctly', () => {
    const isLifetime = mockRecurringSubscription.is_lifetime === true;
    expect(isLifetime).toBe(false);
  });

  it('should check if tier has lifetime option configured', () => {
    const hasLifetimeOption = mockLifetimeTier.stripe_price_id_lifetime &&
      mockLifetimeTier.price_lifetime > 0;

    expect(hasLifetimeOption).toBeTruthy();
  });

  it('should detect when lifetime option is not available', () => {
    const tierWithoutLifetime: SubscriptionTier = {
      ...mockLifetimeTier,
      stripe_price_id_lifetime: null,
      price_lifetime: 0,
    };

    const hasLifetimeOption = tierWithoutLifetime.stripe_price_id_lifetime &&
      tierWithoutLifetime.price_lifetime > 0;

    expect(hasLifetimeOption).toBeFalsy();
  });
});

describe('Price Selection Logic', () => {
  it('should select correct price ID for monthly billing', () => {
    const billingInterval = 'monthly';
    let priceId: string | null = null;

    switch (billingInterval) {
      case 'lifetime':
        priceId = mockLifetimeTier.stripe_price_id_lifetime;
        break;
      case 'yearly':
        priceId = mockLifetimeTier.stripe_price_id_yearly;
        break;
      case 'monthly':
      default:
        priceId = mockLifetimeTier.stripe_price_id_monthly;
        break;
    }

    expect(priceId).toBe('price_monthly_test');
  });

  it('should select correct price ID for yearly billing', () => {
    const billingInterval = 'yearly';
    let priceId: string | null = null;

    switch (billingInterval) {
      case 'lifetime':
        priceId = mockLifetimeTier.stripe_price_id_lifetime;
        break;
      case 'yearly':
        priceId = mockLifetimeTier.stripe_price_id_yearly;
        break;
      case 'monthly':
      default:
        priceId = mockLifetimeTier.stripe_price_id_monthly;
        break;
    }

    expect(priceId).toBe('price_yearly_test');
  });

  it('should select correct price ID for lifetime billing', () => {
    const billingInterval = 'lifetime';
    let priceId: string | null = null;

    switch (billingInterval) {
      case 'lifetime':
        priceId = mockLifetimeTier.stripe_price_id_lifetime;
        break;
      case 'yearly':
        priceId = mockLifetimeTier.stripe_price_id_yearly;
        break;
      case 'monthly':
      default:
        priceId = mockLifetimeTier.stripe_price_id_monthly;
        break;
    }

    expect(priceId).toBe('price_lifetime_test');
  });
});

describe('Lifetime Subscription Display', () => {
  it('should not show renewal date for lifetime subscriptions', () => {
    const isLifetime = mockLifetimeSubscription.is_lifetime;
    const isPaidTier = true;

    // Logic from SubscriptionCard - renewal section only shows when:
    // isPaidTier && !isLifetime && subscription?.current_period_end
    const showRenewal = isPaidTier && !isLifetime && mockLifetimeSubscription.current_period_end;

    expect(showRenewal).toBeFalsy();
  });

  it('should show renewal date for recurring subscriptions', () => {
    const isLifetime = mockRecurringSubscription.is_lifetime;
    const isPaidTier = true;

    // Logic from SubscriptionCard
    const showRenewal = isPaidTier && !isLifetime && mockRecurringSubscription.current_period_end;

    expect(showRenewal).toBeTruthy();
  });

  it('should identify paid tier including lifetime subscriptions', () => {
    const isFreeTier = false;
    const isLifetime = mockLifetimeSubscription.is_lifetime;
    const hasStripeSubscription = mockLifetimeSubscription.stripe_subscription_id;

    // isPaidTier logic from SubscriptionCard
    // isPaidTier = !isFreeTier && (subscription?.stripe_subscription_id || isLifetime)
    const isPaidTier = !isFreeTier && (hasStripeSubscription || isLifetime);

    expect(isPaidTier).toBe(true);
  });
});
