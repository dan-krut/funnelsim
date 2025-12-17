/**
 * Admin Area Tests
 * Tests for admin functionality including route protection, user management,
 * tier editing, and whitelabel configuration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// Mock useAuth hook
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    session: { access_token: 'test-token' },
    loading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/admin' }),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Admin Area Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  /**
   * Test 1: Admin route protection - non-admins should be blocked
   */
  describe('Admin Route Protection', () => {
    it('redirects non-admin users away from admin routes', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      // Mock non-admin user
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Not found' }
            })),
            maybeSingle: vi.fn(() => Promise.resolve({
              data: null,
              error: null
            })),
          })),
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      } as any));

      const { useAdmin } = await import('@/hooks/useAdmin');

      // Create a test component that uses useAdmin
      const TestComponent = () => {
        const { isAdmin, isLoading } = useAdmin();

        if (isLoading) return <div>Loading...</div>;
        if (!isAdmin) return <div>Access Denied</div>;
        return <div>Admin Area</div>;
      };

      const Wrapper = createWrapper();
      render(<TestComponent />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('allows admin users to access admin routes', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      // Mock admin user
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'admin-record', user_id: mockUser.id, is_admin: true },
              error: null
            })),
            maybeSingle: vi.fn(() => Promise.resolve({
              data: { id: 'admin-record', user_id: mockUser.id, is_admin: true },
              error: null
            })),
          })),
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      } as any));

      const { useAdmin } = await import('@/hooks/useAdmin');

      const TestComponent = () => {
        const { isAdmin, isLoading } = useAdmin();

        if (isLoading) return <div>Loading...</div>;
        if (!isAdmin) return <div>Access Denied</div>;
        return <div>Admin Area</div>;
      };

      const Wrapper = createWrapper();
      render(<TestComponent />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Area')).toBeInTheDocument();
      });
    });
  });

  /**
   * Test 2: User list displays correctly
   */
  describe('User List Display', () => {
    it('displays user list with correct information', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockSubscriptions = [
        { user_id: 'user-1', tier_id: 'pro', status: 'active' },
        { user_id: 'user-2', tier_id: 'free', status: 'active' },
      ];

      const { UserTable } = await import('@/components/admin/UserTable');

      const Wrapper = createWrapper();
      render(
        <UserTable
          users={mockUsers.map((u, idx) => ({
            ...u,
            subscription: mockSubscriptions[idx],
            funnelCount: idx + 1,
          }))}
          tiers={[
            { id: 'free', name: 'Free' },
            { id: 'pro', name: 'Pro' },
          ] as any}
          onToggleAdmin={vi.fn()}
          adminUserIds={[]}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });
  });

  /**
   * Test 3: Tier editor saves changes
   */
  describe('Tier Editor', () => {
    it('saves tier changes when form is submitted', async () => {
      const mockTier = {
        id: 'tier-1',
        name: 'Pro',
        price_monthly: 29,
        price_yearly: 290,
        max_funnels: 25,
        features: ['Feature 1', 'Feature 2'],
        stripe_product_id: 'prod_123',
        stripe_price_id_monthly: 'price_monthly_123',
        stripe_price_id_yearly: 'price_yearly_123',
        sort_order: 1,
        is_active: true,
      };

      const mockOnSave = vi.fn();
      const mockOnCancel = vi.fn();

      const { TierEditor } = await import('@/components/admin/TierEditor');

      const Wrapper = createWrapper();
      render(
        <TierEditor
          tier={mockTier as any}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={false}
        />,
        { wrapper: Wrapper }
      );

      // Change the name
      const nameInput = screen.getByLabelText(/tier name/i);
      fireEvent.change(nameInput, { target: { value: 'Pro Plus' } });

      // Submit the form
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('validates required fields before saving', async () => {
      const mockTier = {
        id: 'tier-1',
        name: '',
        price_monthly: 0,
        price_yearly: 0,
        max_funnels: 0,
        features: [],
        stripe_product_id: null,
        stripe_price_id_monthly: null,
        stripe_price_id_yearly: null,
        sort_order: 1,
        is_active: true,
      };

      const mockOnSave = vi.fn();
      const mockOnCancel = vi.fn();

      const { TierEditor } = await import('@/components/admin/TierEditor');

      const Wrapper = createWrapper();
      render(
        <TierEditor
          tier={mockTier as any}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={false}
        />,
        { wrapper: Wrapper }
      );

      // Try to submit with empty name
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Should show validation error or not call onSave
      await waitFor(() => {
        // The form should require the name field
        const nameInput = screen.getByLabelText(/tier name/i);
        expect(nameInput).toBeRequired();
      });
    });
  });

  /**
   * Test 4: Subscription table displays status badges correctly
   */
  describe('Subscription Table', () => {
    it('displays subscriptions with correct status badges', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          tier_id: 'pro',
          status: 'active',
          current_period_end: '2024-12-31T00:00:00Z',
          stripe_subscription_id: 'sub_123',
        },
        {
          id: 'sub-2',
          user_id: 'user-2',
          tier_id: 'free',
          status: 'canceled',
          current_period_end: '2024-01-31T00:00:00Z',
          stripe_subscription_id: null,
        },
      ];

      const mockTiers = [
        { id: 'free', name: 'Free' },
        { id: 'pro', name: 'Pro' },
      ];

      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ];

      const { SubscriptionTable } = await import('@/components/admin/SubscriptionTable');

      const Wrapper = createWrapper();
      render(
        <SubscriptionTable
          subscriptions={mockSubscriptions as any}
          tiers={mockTiers as any}
          users={mockUsers as any}
        />,
        { wrapper: Wrapper }
      );

      // Check that status badges are displayed
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('canceled')).toBeInTheDocument();
    });
  });
});
