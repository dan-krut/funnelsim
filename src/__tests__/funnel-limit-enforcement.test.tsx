/**
 * Funnel Limit Enforcement Test Suite
 * Tests for ensuring users cannot create funnels beyond their tier limit
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
        range: vi.fn(() => ({
          ilike: vi.fn(),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'test-token' } }, error: null })),
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
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
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

describe('Funnel Limit Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('New Funnel Button State', () => {
    it('should disable New Funnel button when user is at funnel limit', async () => {
      const { SubscriptionProvider, useSubscription } = await import('@/hooks/useSubscription');

      // Mock: User has 3 funnels (at Free tier limit of 3)
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
        eq: vi.fn().mockResolvedValue({ count: 3, error: null }), // At limit (3/3)
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') return { select: selectMock };
        if (table === 'subscription_tiers') return { select: tierSelectMock };
        if (table === 'funnels') return { select: countSelectMock };
        return { select: vi.fn() };
      });

      // Test component that uses subscription context
      const TestComponent = () => {
        const { canCreateFunnel, funnelCount, funnelLimit, isLoading } = useSubscription();

        if (isLoading) return <div>Loading...</div>;

        return (
          <div>
            <button
              data-testid="new-funnel-btn"
              disabled={!canCreateFunnel}
            >
              New Funnel
            </button>
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

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Button should be disabled
      const button = screen.getByTestId('new-funnel-btn');
      expect(button).toBeDisabled();

      // canCreateFunnel should be false
      expect(screen.getByTestId('can-create')).toHaveTextContent('no');
    });

    it('should enable New Funnel button when user is below limit', async () => {
      const { SubscriptionProvider, useSubscription } = await import('@/hooks/useSubscription');

      // Mock: User has 2 funnels (below Free tier limit of 3)
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
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }), // Below limit (2/3)
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
            <button
              data-testid="new-funnel-btn"
              disabled={!canCreateFunnel}
            >
              New Funnel
            </button>
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

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Button should be enabled
      const button = screen.getByTestId('new-funnel-btn');
      expect(button).not.toBeDisabled();

      // canCreateFunnel should be true
      expect(screen.getByTestId('can-create')).toHaveTextContent('yes');
    });
  });

  describe('Upgrade Prompt', () => {
    it('should show upgrade prompt when user is at funnel limit', async () => {
      const { UpgradePrompt } = await import('@/components/subscription/UpgradePrompt');

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <UpgradePrompt
            currentTier={mockFreeTier}
            funnelCount={3}
            funnelLimit={3}
            onUpgrade={() => {}}
            recommendedTier={mockProTier}
          />
        </Wrapper>
      );

      // Should show the upgrade prompt
      expect(screen.getByText(/funnel limit reached/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument();

      // Should show current vs recommended tier - use getAllByText for multiple elements
      const freeElements = screen.getAllByText('Free');
      expect(freeElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('should NOT show upgrade prompt when user is below limit', async () => {
      const { UpgradePrompt } = await import('@/components/subscription/UpgradePrompt');

      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <UpgradePrompt
            currentTier={mockFreeTier}
            funnelCount={2}
            funnelLimit={3}
            onUpgrade={() => {}}
            recommendedTier={mockProTier}
          />
        </Wrapper>
      );

      // Should return null (empty)
      expect(container.firstChild).toBeNull();
    });
  });

  describe('User Below Limit Can Create Funnel', () => {
    it('should allow funnel creation when canCreateFunnel is true', async () => {
      const { SubscriptionProvider, useSubscription } = await import('@/hooks/useSubscription');
      const onCreateFunnel = vi.fn();

      // Mock: User has 1 funnel (well below Free tier limit of 3)
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
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }), // Well below limit (1/3)
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') return { select: selectMock };
        if (table === 'subscription_tiers') return { select: tierSelectMock };
        if (table === 'funnels') return { select: countSelectMock };
        return { select: vi.fn() };
      });

      const TestComponent = () => {
        const { canCreateFunnel, isLoading } = useSubscription();

        if (isLoading) return <div>Loading...</div>;

        const handleCreate = () => {
          if (canCreateFunnel) {
            onCreateFunnel();
          }
        };

        return (
          <button
            data-testid="create-btn"
            onClick={handleCreate}
            disabled={!canCreateFunnel}
          >
            Create Funnel
          </button>
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

      // Click the button
      const button = screen.getByTestId('create-btn');
      expect(button).not.toBeDisabled();

      fireEvent.click(button);

      // onCreateFunnel should have been called
      expect(onCreateFunnel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unlimited Tier Handling', () => {
    it('should always allow creation for unlimited tier (max_funnels = -1)', async () => {
      const { SubscriptionProvider, useSubscription } = await import('@/hooks/useSubscription');

      const mockEnterpriseTier = {
        ...mockProTier,
        id: 'tier-enterprise',
        name: 'Enterprise',
        max_funnels: -1, // Unlimited
      };

      const mockEnterpriseSubscription = {
        ...mockFreeSubscription,
        tier_id: 'tier-enterprise',
        stripe_subscription_id: 'sub_enterprise_123',
        stripe_customer_id: 'cus_enterprise_123',
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockEnterpriseSubscription, error: null }),
        }),
      });

      const tierSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockEnterpriseTier, error: null }),
        }),
      });

      const countSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 100, error: null }), // Many funnels
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') return { select: selectMock };
        if (table === 'subscription_tiers') return { select: tierSelectMock };
        if (table === 'funnels') return { select: countSelectMock };
        return { select: vi.fn() };
      });

      const TestComponent = () => {
        const { canCreateFunnel, isUnlimited, funnelCount, funnelLimit, isLoading } = useSubscription();

        if (isLoading) return <div>Loading...</div>;

        return (
          <div>
            <span data-testid="can-create">{canCreateFunnel ? 'yes' : 'no'}</span>
            <span data-testid="is-unlimited">{isUnlimited ? 'yes' : 'no'}</span>
            <span data-testid="funnel-count">{funnelCount}</span>
            <span data-testid="funnel-limit">{funnelLimit}</span>
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

      // Should be allowed to create even with 100 funnels
      expect(screen.getByTestId('can-create')).toHaveTextContent('yes');
      expect(screen.getByTestId('is-unlimited')).toHaveTextContent('yes');
      expect(screen.getByTestId('funnel-limit')).toHaveTextContent('-1');
    });
  });
});
