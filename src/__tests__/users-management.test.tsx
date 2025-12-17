/**
 * Users Management Tests (Admin 2.0 - Task Group 3)
 * Tests for user edit dialog, user delete dialog, email validation,
 * self-deletion prevention, and edge function responses.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token' } },
        error: null
      })),
    },
  },
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock fetch for edge function calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// Mock user data for tests
const mockUser = {
  id: 'user-123',
  email: 'testuser@example.com',
  created_at: '2024-01-15T00:00:00Z',
  subscription: {
    id: 'sub-123',
    user_id: 'user-123',
    tier_id: 'tier-free',
    status: 'active',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    created_at: null,
    updated_at: null,
  },
  funnelCount: 5,
};

const mockTiers = [
  { id: 'tier-free', name: 'Free', price_monthly: 0, price_yearly: 0, max_funnels: 3, features: [], sort_order: 0, is_active: true },
  { id: 'tier-pro', name: 'Pro', price_monthly: 29, price_yearly: 290, max_funnels: 25, features: [], sort_order: 1, is_active: true },
];

describe('Users Management Tests (Task Group 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockToast.mockClear();
  });

  /**
   * Test 1: UserEditDialog renders with user data
   */
  describe('UserEditDialog', () => {
    it('renders with user data pre-filled', async () => {
      const { UserEditDialog } = await import('@/components/admin/UserEditDialog');

      const Wrapper = createWrapper();
      render(
        <UserEditDialog
          user={mockUser}
          tiers={mockTiers as any}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      // Check that email field is populated
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('testuser@example.com');

      // Check dialog title
      expect(screen.getByText(/edit user/i)).toBeInTheDocument();
    });

    /**
     * Test 2: Email validation in UserEditDialog
     */
    it('validates email format before saving', async () => {
      const mockOnSave = vi.fn();
      const { UserEditDialog } = await import('@/components/admin/UserEditDialog');

      const Wrapper = createWrapper();
      render(
        <UserEditDialog
          user={mockUser}
          tiers={mockTiers as any}
          onClose={vi.fn()}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      // Change to invalid email
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });

      // onSave should not have been called
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('accepts valid email format', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
          })),
        })),
      } as any);

      const mockOnSave = vi.fn();
      const { UserEditDialog } = await import('@/components/admin/UserEditDialog');

      const Wrapper = createWrapper();
      render(
        <UserEditDialog
          user={mockUser}
          tiers={mockTiers as any}
          onClose={vi.fn()}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      // Change to valid email
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

      // Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Should not show validation error
      await waitFor(() => {
        expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
      });
    });

    /**
     * Test: Password reset button triggers edge function
     */
    it('triggers password reset edge function when button clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Password reset email sent' }),
      });

      const { UserEditDialog } = await import('@/components/admin/UserEditDialog');

      const Wrapper = createWrapper();
      render(
        <UserEditDialog
          user={mockUser}
          tiers={mockTiers as any}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      // Find and click the password reset button
      const resetButton = screen.getByRole('button', { name: /send password reset/i });
      fireEvent.click(resetButton);

      // Verify the edge function was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('admin-reset-password'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(mockUser.id),
          })
        );
      });

      // Verify success toast was shown
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Password reset sent',
          })
        );
      });
    });

    /**
     * Test: Tier dropdown component is present
     */
    it('shows subscription tier dropdown component', async () => {
      const { UserEditDialog } = await import('@/components/admin/UserEditDialog');

      const Wrapper = createWrapper();
      render(
        <UserEditDialog
          user={mockUser}
          tiers={mockTiers as any}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      // Check that subscription tier label is present
      expect(screen.getByLabelText(/subscription tier/i)).toBeInTheDocument();

      // Check that there is a combobox (the select trigger)
      const tierSelect = screen.getByRole('combobox');
      expect(tierSelect).toBeInTheDocument();
    });
  });

  /**
   * Test 3: UserDeleteDialog shows impact summary
   */
  describe('UserDeleteDialog', () => {
    it('shows impact summary with email and funnel count', async () => {
      const { UserDeleteDialog } = await import('@/components/admin/UserDeleteDialog');

      const Wrapper = createWrapper();
      render(
        <UserDeleteDialog
          user={mockUser}
          currentUserId="admin-user-123"
          onClose={vi.fn()}
          onDelete={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      // Should show user email
      expect(screen.getByText(/testuser@example.com/i)).toBeInTheDocument();

      // Should show funnel count
      expect(screen.getByText(/5 funnels/i)).toBeInTheDocument();

      // Should show warning text about permanent action (use getAllByText since there are two mentions)
      const permanentWarnings = screen.getAllByText(/permanent/i);
      expect(permanentWarnings.length).toBeGreaterThan(0);
    });

    /**
     * Test 4: Self-deletion is prevented
     */
    it('prevents self-deletion with disabled button and message', async () => {
      const { UserDeleteDialog } = await import('@/components/admin/UserDeleteDialog');

      // Use the same user ID for current user and target
      const userToDelete = { ...mockUser, id: 'admin-user-123' };

      const Wrapper = createWrapper();
      render(
        <UserDeleteDialog
          user={userToDelete}
          currentUserId="admin-user-123"
          onClose={vi.fn()}
          onDelete={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      // Delete button should be disabled
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();

      // Should show message about self-deletion
      expect(screen.getByText(/cannot delete your own account/i)).toBeInTheDocument();
    });

    it('enables delete button for other users', async () => {
      const { UserDeleteDialog } = await import('@/components/admin/UserDeleteDialog');

      const Wrapper = createWrapper();
      render(
        <UserDeleteDialog
          user={mockUser}
          currentUserId="different-admin-id"
          onClose={vi.fn()}
          onDelete={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      // Delete button should be enabled
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).not.toBeDisabled();
    });
  });

  /**
   * Test 5: admin-delete-user edge function response handling
   */
  describe('Admin Delete User Edge Function', () => {
    it('handles successful delete response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'User deleted successfully' }),
      });

      const mockOnDelete = vi.fn();
      const { UserDeleteDialog } = await import('@/components/admin/UserDeleteDialog');

      const Wrapper = createWrapper();
      render(
        <UserDeleteDialog
          user={mockUser}
          currentUserId="admin-user-123"
          onClose={vi.fn()}
          onDelete={mockOnDelete}
        />,
        { wrapper: Wrapper }
      );

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('admin-delete-user'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ user_id: 'user-123' }),
          })
        );
      });
    });

    it('handles error response from edge function', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized: Admin privileges required' }),
      });

      const mockOnDelete = vi.fn();
      const { UserDeleteDialog } = await import('@/components/admin/UserDeleteDialog');

      const Wrapper = createWrapper();
      render(
        <UserDeleteDialog
          user={mockUser}
          currentUserId="admin-user-123"
          onClose={vi.fn()}
          onDelete={mockOnDelete}
        />,
        { wrapper: Wrapper }
      );

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });

      // onDelete should not be called on error
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    /**
     * Test: Successful delete shows success toast
     */
    it('shows success toast on successful user deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'User deleted successfully' }),
      });

      const mockOnDelete = vi.fn();
      const { UserDeleteDialog } = await import('@/components/admin/UserDeleteDialog');

      const Wrapper = createWrapper();
      render(
        <UserDeleteDialog
          user={mockUser}
          currentUserId="admin-user-123"
          onClose={vi.fn()}
          onDelete={mockOnDelete}
        />,
        { wrapper: Wrapper }
      );

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Wait for success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'User deleted',
          })
        );
      });

      // onDelete callback should be called
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalled();
      });
    });
  });
});
