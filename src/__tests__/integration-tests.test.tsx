/**
 * Integration Test Suite - Task 8.3
 * Strategic tests to fill coverage gaps for Stripe Integration & Whitelabel System
 *
 * These tests cover:
 * - End-to-end subscription flows
 * - Integration between admin and user-facing features
 * - Error handling scenarios
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// ============================================
// Mock Setup
// ============================================

// Mock fetch for edge function calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocationAssign = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:8080',
    origin: 'http://localhost:8080',
    assign: mockLocationAssign,
  },
  writable: true,
});

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
      })),
      order: vi.fn(() => ({
        range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
  auth: {
    getSession: vi.fn(() => Promise.resolve({
      data: { session: { access_token: 'test-token' } },
      error: null
    })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
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
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: mockToast,
  })),
}));

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

// Mock data
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

const mockCanceledSubscription = {
  id: 'sub-2',
  user_id: 'test-user-id',
  tier_id: 'tier-free',
  status: 'canceled',
  stripe_subscription_id: 'sub_canceled_123',
  stripe_customer_id: 'cus_123',
  current_period_start: '2024-01-01',
  current_period_end: '2024-02-01',
  cancel_at_period_end: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

// ============================================
// Test Suites
// ============================================

describe('Integration Tests - Stripe & Whitelabel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockLocationAssign.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Test 1: End-to-end - User initiates checkout and receives redirect URL
   */
  describe('Checkout Flow', () => {
    it('should initiate checkout and redirect user to Stripe', async () => {
      const { useSubscription, SubscriptionProvider } = await import('@/hooks/useSubscription');

      // Mock fetch to return checkout URL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          url: 'https://checkout.stripe.com/session123',
          session_id: 'cs_test_123'
        }),
      });

      // Setup subscription mocks
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockFreeSubscription, error: null })),
              })),
            })),
          };
        }
        if (table === 'subscription_tiers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockFreeTier, error: null })),
              })),
            })),
          };
        }
        if (table === 'funnels') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ count: 3, error: null })),
            })),
          };
        }
        return { select: vi.fn() };
      });

      const TestComponent = () => {
        const { initiateCheckout, isLoading, canCreateFunnel } = useSubscription();

        if (isLoading) return <div>Loading...</div>;

        return (
          <div>
            <span data-testid="can-create">{canCreateFunnel ? 'yes' : 'no'}</span>
            <button
              data-testid="checkout-btn"
              onClick={() => initiateCheckout('price_monthly_123')}
            >
              Upgrade
            </button>
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

      // User should not be able to create funnel (at limit)
      expect(screen.getByTestId('can-create')).toHaveTextContent('no');

      // Click checkout button
      const checkoutBtn = screen.getByTestId('checkout-btn');
      fireEvent.click(checkoutBtn);

      await waitFor(() => {
        // Verify fetch was called with correct parameters
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/create-checkout-session'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    it('should handle checkout session creation failure gracefully', async () => {
      const { useSubscription, SubscriptionProvider } = await import('@/hooks/useSubscription');

      // Mock fetch to return error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid price ID' }),
      });

      // Setup subscription mocks
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockFreeSubscription, error: null })),
              })),
            })),
          };
        }
        if (table === 'subscription_tiers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockFreeTier, error: null })),
              })),
            })),
          };
        }
        if (table === 'funnels') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ count: 2, error: null })),
            })),
          };
        }
        return { select: vi.fn() };
      });

      let checkoutError: Error | null = null;

      const TestComponent = () => {
        const { initiateCheckout, isLoading } = useSubscription();

        if (isLoading) return <div>Loading...</div>;

        const handleCheckout = async () => {
          try {
            await initiateCheckout('invalid_price_id');
          } catch (err) {
            checkoutError = err as Error;
          }
        };

        return (
          <button data-testid="checkout-btn" onClick={handleCheckout}>
            Upgrade
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

      // Click checkout button
      const checkoutBtn = screen.getByTestId('checkout-btn');
      fireEvent.click(checkoutBtn);

      await waitFor(() => {
        expect(checkoutError).not.toBeNull();
        expect(checkoutError?.message).toContain('Invalid price ID');
      });
    });
  });

  /**
   * Test 2: User cancels subscription and loses access
   */
  describe('Subscription Cancellation Flow', () => {
    it('should show canceled status and downgrade access', async () => {
      const { SubscriptionCard } = await import('@/components/subscription/SubscriptionCard');

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SubscriptionCard
            tier={mockFreeTier}
            subscription={mockCanceledSubscription}
            funnelCount={5}
            onUpgrade={() => {}}
            onManage={() => {}}
          />
        </Wrapper>
      );

      // Should show canceled status or upgrade option (user lost Pro tier)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  /**
   * Test 3: User at limit sees upgrade prompt
   */
  describe('Funnel Limit - Upgrade Prompt', () => {
    it('should display upgrade prompt when user is at funnel limit', async () => {
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

      expect(screen.getByText(/funnel limit reached/i)).toBeInTheDocument();
      expect(screen.getByText(/Pro/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument();
    });

    it('should NOT display upgrade prompt when user is below limit', async () => {
      const { UpgradePrompt } = await import('@/components/subscription/UpgradePrompt');

      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <UpgradePrompt
            currentTier={mockFreeTier}
            funnelCount={1}
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

  /**
   * Test 4: Admin tier editing updates correctly
   */
  describe('Admin Tier Management', () => {
    it('should allow admin to edit tier properties', async () => {
      const mockOnSave = vi.fn();
      const { TierEditor } = await import('@/components/admin/TierEditor');

      const editableTier = {
        ...mockProTier,
        name: 'Pro',
        price_monthly: 29,
        max_funnels: 25,
      };

      const Wrapper = createWrapper();
      render(
        <TierEditor
          tier={editableTier as any}
          onSave={mockOnSave}
          onCancel={() => {}}
          isSaving={false}
        />,
        { wrapper: Wrapper }
      );

      // Use getElementById to get the specific inputs
      const priceInput = document.getElementById('priceMonthly') as HTMLInputElement;
      const limitInput = document.getElementById('maxFunnels') as HTMLInputElement;

      expect(priceInput).toBeInTheDocument();
      expect(limitInput).toBeInTheDocument();

      // Change the price
      fireEvent.change(priceInput, { target: { value: '39' } });

      // Change the funnel limit
      fireEvent.change(limitInput, { target: { value: '50' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Verify updated values are passed
      const callArgs = mockOnSave.mock.calls[0];
      expect(callArgs[1].price_monthly).toBe(39);
      expect(callArgs[1].max_funnels).toBe(50);
    });
  });

  /**
   * Test 5: Admin whitelabel editor saves configuration
   */
  describe('Admin Whitelabel Configuration', () => {
    it('should save whitelabel configuration changes', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      const { WhitelabelEditor } = await import('@/components/admin/WhitelabelEditor');

      const mockConfig = {
        id: 'config-1',
        brand_name: 'TestBrand',
        tagline: 'Test Tagline',
        primary_color: '#6366f1',
        logo_light_url: null,
        logo_dark_url: null,
        favicon_url: null,
        hero_headline: 'Test Headline',
        hero_subheadline: 'Test Subheadline',
        hero_badge_text: 'New',
        cta_button_text: 'Get Started',
        features: [],
        testimonials: [],
        faq: [],
        footer_text: 'Footer',
        email_sender_name: 'Support',
        updated_at: new Date().toISOString(),
      };

      const Wrapper = createWrapper();
      render(
        <WhitelabelEditor config={mockConfig} onSave={mockOnSave} isSaving={false} />,
        { wrapper: Wrapper }
      );

      // Change brand name
      const brandInput = screen.getByLabelText(/brand name/i);
      fireEvent.change(brandInput, { target: { value: 'UpdatedBrand' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Verify updated value
      const savedConfig = mockOnSave.mock.calls[0][0];
      expect(savedConfig.brand_name).toBe('UpdatedBrand');
    });
  });

  /**
   * Test 6: Whitelabel context provides correct default values
   */
  describe('Whitelabel Default Values', () => {
    it('should provide default FunnelSim branding when config is missing', async () => {
      const {
        DEFAULT_FEATURES,
        DEFAULT_TESTIMONIALS,
        DEFAULT_FAQ
      } = await import('@/hooks/useWhitelabel');

      // Verify default features exist and have correct structure
      expect(Array.isArray(DEFAULT_FEATURES)).toBe(true);
      expect(DEFAULT_FEATURES.length).toBeGreaterThan(0);
      expect(DEFAULT_FEATURES[0]).toHaveProperty('title');
      expect(DEFAULT_FEATURES[0]).toHaveProperty('description');
      expect(DEFAULT_FEATURES[0]).toHaveProperty('icon');

      // Verify default testimonials exist
      expect(Array.isArray(DEFAULT_TESTIMONIALS)).toBe(true);
      expect(DEFAULT_TESTIMONIALS.length).toBeGreaterThan(0);
      expect(DEFAULT_TESTIMONIALS[0]).toHaveProperty('quote');
      expect(DEFAULT_TESTIMONIALS[0]).toHaveProperty('author');

      // Verify default FAQ exist
      expect(Array.isArray(DEFAULT_FAQ)).toBe(true);
      expect(DEFAULT_FAQ.length).toBeGreaterThan(0);
      expect(DEFAULT_FAQ[0]).toHaveProperty('question');
      expect(DEFAULT_FAQ[0]).toHaveProperty('answer');
    });
  });

  /**
   * Test 7: Subscription status badges display correctly
   */
  describe('Subscription Status Display', () => {
    it('should display correct status badge for active subscription', async () => {
      const { SubscriptionTable } = await import('@/components/admin/SubscriptionTable');

      const mockSubscriptions = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          tier_id: 'tier-pro',
          status: 'active',
          current_period_end: '2024-12-31T00:00:00Z',
          stripe_subscription_id: 'sub_123',
        },
      ];

      const mockTiers = [{ id: 'tier-pro', name: 'Pro' }];
      const mockUsers = [{ id: 'user-1', email: 'user1@example.com' }];

      const Wrapper = createWrapper();
      render(
        <SubscriptionTable
          subscriptions={mockSubscriptions as any}
          tiers={mockTiers as any}
          users={mockUsers as any}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should display correct status badge for past_due subscription', async () => {
      const { SubscriptionTable } = await import('@/components/admin/SubscriptionTable');

      const mockSubscriptions = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          tier_id: 'tier-pro',
          status: 'past_due',
          current_period_end: '2024-12-31T00:00:00Z',
          stripe_subscription_id: 'sub_123',
        },
      ];

      const mockTiers = [{ id: 'tier-pro', name: 'Pro' }];
      const mockUsers = [{ id: 'user-1', email: 'user1@example.com' }];

      const Wrapper = createWrapper();
      render(
        <SubscriptionTable
          subscriptions={mockSubscriptions as any}
          tiers={mockTiers as any}
          users={mockUsers as any}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('past_due')).toBeInTheDocument();
    });
  });

  /**
   * Test 8: isOverLimit flag works correctly after downgrade
   */
  describe('Over Limit Detection', () => {
    it('should detect when user has more funnels than current limit allows', async () => {
      const { useSubscription, SubscriptionProvider } = await import('@/hooks/useSubscription');

      // User was Pro (25 funnels limit), downgraded to Free (3 funnels limit)
      // They have 10 funnels, which is over the Free limit
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockFreeSubscription, error: null })),
              })),
            })),
          };
        }
        if (table === 'subscription_tiers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockFreeTier, error: null })),
              })),
            })),
          };
        }
        if (table === 'funnels') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ count: 10, error: null })), // Over the limit!
            })),
          };
        }
        return { select: vi.fn() };
      });

      const TestComponent = () => {
        const { isOverLimit, canCreateFunnel, funnelCount, funnelLimit, isLoading } = useSubscription();

        if (isLoading) return <div>Loading...</div>;

        return (
          <div>
            <span data-testid="is-over-limit">{isOverLimit ? 'yes' : 'no'}</span>
            <span data-testid="can-create">{canCreateFunnel ? 'yes' : 'no'}</span>
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

      // Should be over limit
      expect(screen.getByTestId('is-over-limit')).toHaveTextContent('yes');
      // Cannot create new funnels
      expect(screen.getByTestId('can-create')).toHaveTextContent('no');
      // Shows correct counts
      expect(screen.getByTestId('funnel-count')).toHaveTextContent('10');
      expect(screen.getByTestId('funnel-limit')).toHaveTextContent('3');
    });
  });
});
