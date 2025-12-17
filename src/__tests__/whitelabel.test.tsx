/**
 * Whitelabel System Tests
 * Tests for whitelabel functionality including hook loading, env var overrides,
 * dynamic landing page content, and admin editor.
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
        single: vi.fn(() => Promise.resolve({
          data: {
            id: 'config-1',
            brand_name: 'TestBrand',
            tagline: 'Test Tagline',
            primary_color: '#ff0000',
            logo_light_url: 'https://example.com/logo-light.png',
            logo_dark_url: 'https://example.com/logo-dark.png',
            favicon_url: 'https://example.com/favicon.ico',
            hero_headline: 'Test Headline',
            hero_subheadline: 'Test Subheadline',
            hero_badge_text: 'New Feature',
            cta_button_text: 'Get Started',
            features: [
              { title: 'Feature 1', description: 'Description 1', icon: 'Zap' },
              { title: 'Feature 2', description: 'Description 2', icon: 'Star' },
            ],
            testimonials: [
              { quote: 'Great product!', author: 'John Doe', role: 'CEO', image: null },
            ],
            faq: [
              { question: 'What is this?', answer: 'A test product.' },
            ],
            footer_text: 'Test Footer',
            email_sender_name: 'Test Support',
          },
          error: null,
        })),
        maybeSingle: vi.fn(() => Promise.resolve({
          data: {
            id: 'config-1',
            brand_name: 'TestBrand',
            tagline: 'Test Tagline',
            primary_color: '#ff0000',
          },
          error: null,
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
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

describe('Whitelabel System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: useWhitelabel hook loads config correctly from database
   */
  describe('useWhitelabel Hook', () => {
    it('loads whitelabel config from database correctly', async () => {
      const { useWhitelabel, WhitelabelProvider } = await import('@/hooks/useWhitelabel');

      const TestComponent = () => {
        const { config, isLoading } = useWhitelabel();

        if (isLoading) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="brand-name">{config.brand_name}</span>
            <span data-testid="tagline">{config.tagline}</span>
            <span data-testid="hero-headline">{config.hero_headline}</span>
          </div>
        );
      };

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <WhitelabelProvider>
            <TestComponent />
          </WhitelabelProvider>
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('brand-name')).toHaveTextContent('TestBrand');
      });

      expect(screen.getByTestId('tagline')).toHaveTextContent('Test Tagline');
      expect(screen.getByTestId('hero-headline')).toHaveTextContent('Test Headline');
    });

    it('provides default values when config is missing', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      // Mock empty response
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      } as ReturnType<typeof supabase.from>));

      // Need to reimport after changing mock
      vi.resetModules();
      const { useWhitelabel, WhitelabelProvider } = await import('@/hooks/useWhitelabel');

      const TestComponent = () => {
        const { config, isLoading } = useWhitelabel();

        if (isLoading) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="brand-name">{config.brand_name}</span>
          </div>
        );
      };

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <WhitelabelProvider>
            <TestComponent />
          </WhitelabelProvider>
        </Wrapper>
      );

      await waitFor(() => {
        // Should fall back to default 'FunnelSim'
        expect(screen.getByTestId('brand-name')).toHaveTextContent('FunnelSim');
      });
    });
  });

  /**
   * Test 2: Default features and FAQ are exported
   */
  describe('Default Content Exports', () => {
    it('exports DEFAULT_FEATURES with correct structure', async () => {
      const { DEFAULT_FEATURES } = await import('@/hooks/useWhitelabel');

      expect(Array.isArray(DEFAULT_FEATURES)).toBe(true);
      expect(DEFAULT_FEATURES.length).toBeGreaterThan(0);

      // Check first feature has required properties
      const firstFeature = DEFAULT_FEATURES[0];
      expect(firstFeature).toHaveProperty('title');
      expect(firstFeature).toHaveProperty('description');
      expect(firstFeature).toHaveProperty('icon');
    });

    it('exports DEFAULT_FAQ with correct structure', async () => {
      const { DEFAULT_FAQ } = await import('@/hooks/useWhitelabel');

      expect(Array.isArray(DEFAULT_FAQ)).toBe(true);
      expect(DEFAULT_FAQ.length).toBeGreaterThan(0);

      // Check first FAQ has required properties
      const firstFaq = DEFAULT_FAQ[0];
      expect(firstFaq).toHaveProperty('question');
      expect(firstFaq).toHaveProperty('answer');
    });

    it('exports DEFAULT_TESTIMONIALS with correct structure', async () => {
      const { DEFAULT_TESTIMONIALS } = await import('@/hooks/useWhitelabel');

      expect(Array.isArray(DEFAULT_TESTIMONIALS)).toBe(true);
      expect(DEFAULT_TESTIMONIALS.length).toBeGreaterThan(0);

      // Check first testimonial has required properties
      const firstTestimonial = DEFAULT_TESTIMONIALS[0];
      expect(firstTestimonial).toHaveProperty('quote');
      expect(firstTestimonial).toHaveProperty('author');
    });
  });

  /**
   * Test 3: Admin editor saves whitelabel config
   */
  describe('Admin Whitelabel Editor', () => {
    it('renders all configuration tabs', async () => {
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
        <WhitelabelEditor config={mockConfig} onSave={vi.fn()} isSaving={false} />,
        { wrapper: Wrapper }
      );

      // Check that all tab triggers are present using role
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(5); // Branding, Hero, Features, Testimonials, FAQ
    });

    it('saves whitelabel configuration when form is submitted', async () => {
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

      const mockOnSave = vi.fn().mockResolvedValue(undefined);

      const Wrapper = createWrapper();
      render(
        <WhitelabelEditor config={mockConfig} onSave={mockOnSave} isSaving={false} />,
        { wrapper: Wrapper }
      );

      // Change brand name
      const brandInput = screen.getByLabelText(/brand name/i);
      fireEvent.change(brandInput, { target: { value: 'NewBrand' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Verify the call includes the new brand name
      const savedConfig = mockOnSave.mock.calls[0][0];
      expect(savedConfig.brand_name).toBe('NewBrand');
    });

    it('shows brand name input with correct initial value', async () => {
      const { WhitelabelEditor } = await import('@/components/admin/WhitelabelEditor');

      const mockConfig = {
        id: 'config-1',
        brand_name: 'MyCustomBrand',
        tagline: null,
        primary_color: null,
        logo_light_url: null,
        logo_dark_url: null,
        favicon_url: null,
        hero_headline: null,
        hero_subheadline: null,
        hero_badge_text: null,
        cta_button_text: null,
        features: null,
        testimonials: null,
        faq: null,
        footer_text: null,
        email_sender_name: null,
        updated_at: null,
      };

      const Wrapper = createWrapper();
      render(
        <WhitelabelEditor config={mockConfig} onSave={vi.fn()} isSaving={false} />,
        { wrapper: Wrapper }
      );

      const brandInput = screen.getByLabelText(/brand name/i) as HTMLInputElement;
      expect(brandInput.value).toBe('MyCustomBrand');
    });
  });
});
