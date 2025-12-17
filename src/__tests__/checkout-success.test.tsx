/**
 * CheckoutSuccess Component Test Suite
 * Tests for the checkout success page post-payment account creation flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
      })),
    })),
  })),
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signUp: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock useWhitelabel hook
vi.mock('@/hooks/useWhitelabel', () => ({
  useWhitelabel: vi.fn(() => ({
    config: {
      brand_name: 'TestBrand',
      logo_light_url: null,
      logo_dark_url: null,
    },
    isLoading: false,
  })),
}));

// Mock useTheme hook
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn(),
  })),
}));

// Mock ThemeToggle component
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  CheckCircle2: () => <span data-testid="check-icon" />,
  AlertCircle: () => <span data-testid="alert-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
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
      {children}
    </QueryClientProvider>
  );
};

describe('CheckoutSuccess Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Session ID Validation', () => {
    it('should redirect to landing page when session_id is missing', async () => {
      const CheckoutSuccessModule = await import('@/pages/CheckoutSuccess');
      const CheckoutSuccess = CheckoutSuccessModule.default;

      const Wrapper = createWrapper();
      render(
        <MemoryRouter initialEntries={['/checkout/success']}>
          <Wrapper>
            <CheckoutSuccess />
          </Wrapper>
        </MemoryRouter>
      );

      // Should redirect to landing page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should render page when valid session_id is present', async () => {
      // Mock successful session retrieval
      mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
        data: {
          customer_email: 'test@example.com',
          payment_status: 'paid',
          tier_name: 'Pro',
          tier_id: 'tier-pro-123',
        },
        error: null,
      });

      const CheckoutSuccessModule = await import('@/pages/CheckoutSuccess');
      const CheckoutSuccess = CheckoutSuccessModule.default;

      const Wrapper = createWrapper();
      render(
        <MemoryRouter initialEntries={['/checkout/success?session_id=cs_test_123']}>
          <Wrapper>
            <CheckoutSuccess />
          </Wrapper>
        </MemoryRouter>
      );

      // Should show loading initially
      expect(screen.getByText(/loading/i) || screen.getByTestId('loader-icon')).toBeTruthy();

      // Wait for session data to load
      await waitFor(() => {
        expect(screen.getByText(/complete your account/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      // Mock successful session retrieval for all form tests
      mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
        data: {
          customer_email: 'test@example.com',
          payment_status: 'paid',
          tier_name: 'Pro',
          tier_id: 'tier-pro-123',
        },
        error: null,
      });
    });

    it('should display error when passwords do not match', async () => {
      const CheckoutSuccessModule = await import('@/pages/CheckoutSuccess');
      const CheckoutSuccess = CheckoutSuccessModule.default;

      const Wrapper = createWrapper();
      render(
        <MemoryRouter initialEntries={['/checkout/success?session_id=cs_test_123']}>
          <Wrapper>
            <CheckoutSuccess />
          </Wrapper>
        </MemoryRouter>
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Fill in mismatched passwords
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Should show toast with error
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            description: expect.stringContaining('match'),
          })
        );
      });
    });

    it('should display error when password is too short', async () => {
      const CheckoutSuccessModule = await import('@/pages/CheckoutSuccess');
      const CheckoutSuccess = CheckoutSuccessModule.default;

      const Wrapper = createWrapper();
      render(
        <MemoryRouter initialEntries={['/checkout/success?session_id=cs_test_123']}>
          <Wrapper>
            <CheckoutSuccess />
          </Wrapper>
        </MemoryRouter>
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Fill in short password
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: '123' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Should show toast with error
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            description: expect.stringContaining('6 characters'),
          })
        );
      });
    });
  });

  describe('Email Collision Handling', () => {
    it('should display error when email already exists', async () => {
      // Mock successful session retrieval
      mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
        data: {
          customer_email: 'existing@example.com',
          payment_status: 'paid',
          tier_name: 'Pro',
          tier_id: 'tier-pro-123',
        },
        error: null,
      });

      // Mock signUp to fail with email already exists error
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const CheckoutSuccessModule = await import('@/pages/CheckoutSuccess');
      const CheckoutSuccess = CheckoutSuccessModule.default;

      const Wrapper = createWrapper();
      render(
        <MemoryRouter initialEntries={['/checkout/success?session_id=cs_test_123']}>
          <Wrapper>
            <CheckoutSuccess />
          </Wrapper>
        </MemoryRouter>
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Fill in valid passwords
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Should show email collision message
      await waitFor(() => {
        expect(screen.getByText(/already has an account/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show link to login
      expect(screen.getByRole('link', { name: /log in/i }) || screen.getByText(/log in/i)).toBeTruthy();
    });
  });

  describe('Successful Account Creation Flow', () => {
    it('should create account and link subscription successfully', async () => {
      // Mock successful session retrieval
      mockSupabaseClient.functions.invoke
        .mockResolvedValueOnce({
          data: {
            customer_email: 'newuser@example.com',
            payment_status: 'paid',
            tier_name: 'Pro',
            tier_id: 'tier-pro-123',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          // Mock link-pending-subscription success
          data: { success: true, tier_id: 'tier-pro-123' },
          error: null,
        });

      // Mock successful signUp
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'new-user-id', email: 'newuser@example.com' },
          session: null,
        },
        error: null,
      });

      const CheckoutSuccessModule = await import('@/pages/CheckoutSuccess');
      const CheckoutSuccess = CheckoutSuccessModule.default;

      const Wrapper = createWrapper();
      render(
        <MemoryRouter initialEntries={['/checkout/success?session_id=cs_test_123']}>
          <Wrapper>
            <CheckoutSuccess />
          </Wrapper>
        </MemoryRouter>
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Fill in valid passwords
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should have link/button to dashboard
      expect(screen.getByRole('link', { name: /dashboard/i }) || screen.getByText(/dashboard/i)).toBeTruthy();
    });
  });

  describe('Error States', () => {
    it('should display error when session retrieval fails', async () => {
      // Mock failed session retrieval
      mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session not found' },
      });

      const CheckoutSuccessModule = await import('@/pages/CheckoutSuccess');
      const CheckoutSuccess = CheckoutSuccessModule.default;

      const Wrapper = createWrapper();
      render(
        <MemoryRouter initialEntries={['/checkout/success?session_id=cs_invalid']}>
          <Wrapper>
            <CheckoutSuccess />
          </Wrapper>
        </MemoryRouter>
      );

      // Should show error state with retry option
      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i) || mockToast).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});
