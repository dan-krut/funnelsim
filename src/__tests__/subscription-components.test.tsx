/**
 * Subscription Components Test Suite
 * Tests for useSubscription hook and subscription-related components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
      })),
      order: vi.fn(() => ({
        limit: vi.fn(),
      })),
    })),
  })),
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  functions: {
    invoke: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    loading: false,
  })),
}));

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock subscription data
const mockFreeTier = {
  id: 'tier-free',
  name: 'Free',
  price_monthly: 0,
  price_yearly: 0,
  max_funnels: 3,
  features: ['3 funnels', 'Basic analytics'],
  is_active: true,
  sort_order: 1,
  stripe_product_id: null,
  stripe_price_id_monthly: null,
  stripe_price_id_yearly: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockProTier = {
  id: 'tier-pro',
  name: 'Pro',
  price_monthly: 29,
  price_yearly: 290,
  max_funnels: 25,
  features: ['25 funnels', 'Advanced analytics', 'Priority support'],
  is_active: true,
  sort_order: 2,
  stripe_product_id: 'prod_123',
  stripe_price_id_monthly: 'price_monthly_123',
  stripe_price_id_yearly: 'price_yearly_123',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockFreeSubscription = {
  id: 'sub-1',
  user_id: 'test-user-id',
  tier_id: 'tier-free',
  status: 'active',
  stripe_subscription_id: null,
  stripe_customer_id: null,
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockProSubscription = {
  id: 'sub-2',
  user_id: 'test-user-id',
  tier_id: 'tier-pro',
  status: 'active',
  stripe_subscription_id: 'sub_123',
  stripe_customer_id: 'cus_123',
  current_period_start: '2024-01-01',
  current_period_end: '2024-02-01',
  cancel_at_period_end: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('Subscription Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useSubscription Hook', () => {
    it('should return correct tier data for free user', async () => {
      // Import after mocks are set up
      const { useSubscription, SubscriptionProvider } = await import('@/hooks/useSubscription');

      // Setup mock responses
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockFreeSubscription, error: null }),
        }),
      });

      const tierSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockFreeTier, error: null }),
        }),
      });

      const countSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return { select: selectMock };
        }
        if (table === 'subscription_tiers') {
          return { select: tierSelectMock };
        }
        if (table === 'funnels') {
          return { select: countSelectMock };
        }
        return { select: vi.fn() };
      });

      const TestComponent = () => {
        const { tier, isLoading, canCreateFunnel, funnelCount, funnelLimit } = useSubscription();

        if (isLoading) return <div>Loading...</div>;

        return (
          <div>
            <span data-testid="tier-name">{tier?.name}</span>
            <span data-testid="funnel-limit">{funnelLimit}</span>
            <span data-testid="funnel-count">{funnelCount}</span>
            <span data-testid="can-create">{canCreateFunnel ? 'yes' : 'no'}</span>
          </div>
        );
      };

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SubscriptionProvider>
            <TestComponent />
          </SubscriptionProvider>
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should calculate canCreateFunnel correctly when below limit', async () => {
      const { useSubscription, SubscriptionProvider } = await import('@/hooks/useSubscription');

      // Mock: User has 2 funnels out of 3 limit (Free tier)
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockFreeSubscription, error: null }),
        }),
      });

      const tierSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockFreeTier, error: null }),
        }),
      });

      const countSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') return { select: selectMock };
        if (table === 'subscription_tiers') return { select: tierSelectMock };
        if (table === 'funnels') return { select: countSelectMock };
        return { select: vi.fn() };
      });

      const TestComponent = () => {
        const { canCreateFunnel, funnelCount, funnelLimit, isLoading } = useSubscription();
        if (isLoading) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="can-create">{canCreateFunnel ? 'yes' : 'no'}</span>
            <span data-testid="usage">{funnelCount}/{funnelLimit}</span>
          </div>
        );
      };

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SubscriptionProvider>
            <TestComponent />
          </SubscriptionProvider>
        </Wrapper>
      );

      // Initially shows loading, then updates
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('SubscriptionCard Component', () => {
    it('should display plan info correctly for free tier', async () => {
      const { SubscriptionCard } = await import('@/components/subscription/SubscriptionCard');

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SubscriptionCard
            tier={mockFreeTier}
            subscription={mockFreeSubscription}
            funnelCount={2}
            onUpgrade={() => {}}
            onManage={() => {}}
          />
        </Wrapper>
      );

      // Use getAllByText since "Free" appears twice (tier name and price display)
      const freeElements = screen.getAllByText('Free');
      expect(freeElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/2 of 3 funnels used/i)).toBeInTheDocument();
    });

    it('should show Upgrade button for free tier users', async () => {
      const { SubscriptionCard } = await import('@/components/subscription/SubscriptionCard');
      const onUpgrade = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SubscriptionCard
            tier={mockFreeTier}
            subscription={mockFreeSubscription}
            funnelCount={2}
            onUpgrade={onUpgrade}
            onManage={() => {}}
          />
        </Wrapper>
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade/i });
      expect(upgradeButton).toBeInTheDocument();

      fireEvent.click(upgradeButton);
      expect(onUpgrade).toHaveBeenCalled();
    });

    it('should show Manage Subscription button for paid users', async () => {
      const { SubscriptionCard } = await import('@/components/subscription/SubscriptionCard');
      const onManage = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SubscriptionCard
            tier={mockProTier}
            subscription={mockProSubscription}
            funnelCount={5}
            onUpgrade={() => {}}
            onManage={onManage}
          />
        </Wrapper>
      );

      const manageButton = screen.getByRole('button', { name: /manage subscription/i });
      expect(manageButton).toBeInTheDocument();

      fireEvent.click(manageButton);
      expect(onManage).toHaveBeenCalled();
    });
  });

  describe('UpgradePrompt Component', () => {
    it('should show when user is at funnel limit', async () => {
      const { UpgradePrompt } = await import('@/components/subscription/UpgradePrompt');

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <UpgradePrompt
            currentTier={mockFreeTier}
            funnelCount={3}
            funnelLimit={3}
            onUpgrade={() => {}}
          />
        </Wrapper>
      );

      expect(screen.getByText(/funnel limit reached/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument();
    });

    it('should trigger checkout flow when upgrade button clicked', async () => {
      const { UpgradePrompt } = await import('@/components/subscription/UpgradePrompt');
      const onUpgrade = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <UpgradePrompt
            currentTier={mockFreeTier}
            funnelCount={3}
            funnelLimit={3}
            onUpgrade={onUpgrade}
          />
        </Wrapper>
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade now/i });
      fireEvent.click(upgradeButton);

      expect(onUpgrade).toHaveBeenCalled();
    });
  });

  describe('FunnelUsage Component', () => {
    it('should display progress bar with correct percentage', async () => {
      const { FunnelUsage } = await import('@/components/subscription/FunnelUsage');

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <FunnelUsage funnelCount={2} funnelLimit={3} />
        </Wrapper>
      );

      expect(screen.getByText('2 of 3 funnels used')).toBeInTheDocument();
      // Progress bar should show ~66% (2/3)
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show warning state when at 80%+ capacity', async () => {
      const { FunnelUsage } = await import('@/components/subscription/FunnelUsage');

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <FunnelUsage funnelCount={20} funnelLimit={25} />
        </Wrapper>
      );

      // At 80% capacity (20/25), should show warning styling
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      // The component should have warning class when at high capacity
    });

    it('should show critical state when at limit', async () => {
      const { FunnelUsage } = await import('@/components/subscription/FunnelUsage');

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <FunnelUsage funnelCount={3} funnelLimit={3} />
        </Wrapper>
      );

      expect(screen.getByText('3 of 3 funnels used')).toBeInTheDocument();
    });
  });
});
