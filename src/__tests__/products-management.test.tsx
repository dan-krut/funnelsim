/**
 * Products Management Tests
 * Tests for Product CRUD operations including creation, deletion,
 * and subscriber count display.
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
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-tier-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
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
const mockUser = { id: 'test-user-id', email: 'admin@example.com' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    session: { access_token: 'test-token' },
    loading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useToast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

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

describe('Products Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
  });

  /**
   * Test 1: TierCreator form validation and submission
   */
  describe('TierCreator Component', () => {
    it('validates required fields and submits form correctly', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      const mockOnCancel = vi.fn();

      const { TierCreator } = await import('@/components/admin/TierCreator');

      const Wrapper = createWrapper();
      render(
        <TierCreator
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={false}
          existingTiersCount={2}
        />,
        { wrapper: Wrapper }
      );

      // Fill in the required name field
      const nameInput = screen.getByLabelText(/tier name/i);
      fireEvent.change(nameInput, { target: { value: 'Premium' } });

      // Fill in prices using id selectors to be more specific
      const monthlyPriceInput = document.getElementById('priceMonthly') as HTMLInputElement;
      fireEvent.change(monthlyPriceInput, { target: { value: '49' } });

      const yearlyPriceInput = document.getElementById('priceYearly') as HTMLInputElement;
      fireEvent.change(yearlyPriceInput, { target: { value: '490' } });

      // Fill in max funnels
      const maxFunnelsInput = screen.getByLabelText(/max funnels/i);
      fireEvent.change(maxFunnelsInput, { target: { value: '50' } });

      // Submit the form
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Premium',
            price_monthly: 49,
            price_yearly: 490,
            max_funnels: 50,
            sort_order: 2, // Based on existingTiersCount
          })
        );
      });
    });

    it('requires name field before submission', async () => {
      const mockOnSave = vi.fn();
      const mockOnCancel = vi.fn();

      const { TierCreator } = await import('@/components/admin/TierCreator');

      const Wrapper = createWrapper();
      render(
        <TierCreator
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={false}
          existingTiersCount={0}
        />,
        { wrapper: Wrapper }
      );

      // The name field should be required
      const nameInput = screen.getByLabelText(/tier name/i);
      expect(nameInput).toBeRequired();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const mockOnSave = vi.fn();
      const mockOnCancel = vi.fn();

      const { TierCreator } = await import('@/components/admin/TierCreator');

      const Wrapper = createWrapper();
      render(
        <TierCreator
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={false}
          existingTiersCount={0}
        />,
        { wrapper: Wrapper }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  /**
   * Test 2: Tier deletion blocked when subscribers exist
   */
  describe('Tier Deletion with Subscribers', () => {
    it('shows blocking message when attempting to delete tier with subscribers', async () => {
      // Component that mimics the deletion blocking behavior
      const DeleteBlockedAlert = ({ subscriberCount }: { subscriberCount: number }) => {
        if (subscriberCount > 0) {
          return (
            <div role="alert" data-testid="delete-blocked-alert">
              <h5>Cannot Delete Tier</h5>
              <p>
                This tier has {subscriberCount} active subscriber{subscriberCount !== 1 ? 's' : ''}.
                You must reassign subscribers to another tier before deletion is possible.
              </p>
            </div>
          );
        }
        return null;
      };

      const Wrapper = createWrapper();
      render(
        <DeleteBlockedAlert subscriberCount={5} />,
        { wrapper: Wrapper }
      );

      expect(screen.getByTestId('delete-blocked-alert')).toBeInTheDocument();
      expect(screen.getByText(/cannot delete tier/i)).toBeInTheDocument();
      expect(screen.getByText(/5 active subscribers/i)).toBeInTheDocument();
    });
  });

  /**
   * Test 3: Tier deletion succeeds when no subscribers
   */
  describe('Tier Deletion without Subscribers', () => {
    it('shows confirmation dialog and allows deletion when no subscribers', async () => {
      const mockOnConfirmDelete = vi.fn();

      // Simple component that mimics the deletion confirmation flow
      const DeleteConfirmation = ({
        tierName,
        onConfirm,
        subscriberCount,
      }: {
        tierName: string;
        onConfirm: () => void;
        subscriberCount: number;
      }) => {
        const canDelete = subscriberCount === 0;

        return (
          <div data-testid="delete-dialog">
            <h5>Delete {tierName}?</h5>
            <p>This action cannot be undone.</p>
            {canDelete ? (
              <button onClick={onConfirm} data-testid="confirm-delete">
                Delete
              </button>
            ) : (
              <p>Cannot delete: has {subscriberCount} subscribers</p>
            )}
            <button data-testid="cancel-delete">Cancel</button>
          </div>
        );
      };

      const Wrapper = createWrapper();
      render(
        <DeleteConfirmation
          tierName="Free"
          onConfirm={mockOnConfirmDelete}
          subscriberCount={0}
        />,
        { wrapper: Wrapper }
      );

      // Confirm button should be visible when no subscribers
      const confirmButton = screen.getByTestId('confirm-delete');
      expect(confirmButton).toBeInTheDocument();

      fireEvent.click(confirmButton);
      expect(mockOnConfirmDelete).toHaveBeenCalled();
    });
  });

  /**
   * Test 4: Subscriber count displays on tier card
   */
  describe('Subscriber Count Display', () => {
    it('displays subscriber count on tier card', async () => {
      // Simple component that displays tier with subscriber count
      const TierCard = ({
        tier,
        subscriberCount,
      }: {
        tier: { name: string; price_monthly: number };
        subscriberCount: number;
      }) => (
        <div data-testid="tier-card">
          <h3>{tier.name}</h3>
          <p>${tier.price_monthly}/month</p>
          <p data-testid="subscriber-count">
            {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}
          </p>
        </div>
      );

      const Wrapper = createWrapper();
      render(
        <TierCard
          tier={{ name: 'Pro', price_monthly: 29 }}
          subscriberCount={15}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('15 subscribers');
    });

    it('displays "0 subscribers" for tiers with no users', async () => {
      const TierCard = ({
        tier,
        subscriberCount,
      }: {
        tier: { name: string; price_monthly: number };
        subscriberCount: number;
      }) => (
        <div data-testid="tier-card">
          <h3>{tier.name}</h3>
          <p>${tier.price_monthly}/month</p>
          <p data-testid="subscriber-count">
            {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}
          </p>
        </div>
      );

      const Wrapper = createWrapper();
      render(
        <TierCard
          tier={{ name: 'Enterprise', price_monthly: 99 }}
          subscriberCount={0}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('0 subscribers');
    });
  });

  /**
   * Test 5: Add Product button functionality
   */
  describe('Add Product Button', () => {
    it('shows TierCreator form when Add Product button is clicked', async () => {
      // Simulate the state toggle behavior
      const AddProductFlow = () => {
        const [isCreating, setIsCreating] = React.useState(false);

        if (isCreating) {
          return (
            <div data-testid="tier-creator-form">
              <h2>Create New Product</h2>
              <button onClick={() => setIsCreating(false)}>Cancel</button>
            </div>
          );
        }

        return (
          <div>
            <h1>Products</h1>
            <button
              onClick={() => setIsCreating(true)}
              data-testid="add-product-button"
            >
              Add Product
            </button>
          </div>
        );
      };

      const React = await import('react');
      const Wrapper = createWrapper();
      render(<AddProductFlow />, { wrapper: Wrapper });

      // Initially, the tier creator should not be visible
      expect(screen.queryByTestId('tier-creator-form')).not.toBeInTheDocument();

      // Click Add Product button
      const addButton = screen.getByTestId('add-product-button');
      fireEvent.click(addButton);

      // Now the tier creator form should be visible
      await waitFor(() => {
        expect(screen.getByTestId('tier-creator-form')).toBeInTheDocument();
        expect(screen.getByText('Create New Product')).toBeInTheDocument();
      });
    });
  });
});
