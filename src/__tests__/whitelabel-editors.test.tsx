/**
 * Whitelabel Form Editors Tests
 * Tests for FeatureFormEditor, TestimonialFormEditor, FAQFormEditor,
 * and LogoUploader integration in WhitelabelEditor.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import type { WhitelabelFeature, WhitelabelTestimonial, WhitelabelFAQ } from '@/integrations/supabase/types';

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
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test/image.png' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test/image.png' } })),
      })),
    },
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

describe('Whitelabel Form Editors Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: FeatureFormEditor renders feature rows with icon picker
   */
  describe('FeatureFormEditor', () => {
    it('renders feature rows with icon picker, title, and description', async () => {
      const mockFeatures: WhitelabelFeature[] = [
        { title: 'Feature 1', description: 'Description 1', icon: 'Zap' },
        { title: 'Feature 2', description: 'Description 2', icon: 'Star' },
      ];
      const mockOnChange = vi.fn();

      const { FeatureFormEditor } = await import('@/components/admin/FeatureFormEditor');

      const Wrapper = createWrapper();
      render(
        <FeatureFormEditor features={mockFeatures} onChange={mockOnChange} />,
        { wrapper: Wrapper }
      );

      // Check that feature titles are rendered
      expect(screen.getByDisplayValue('Feature 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Feature 2')).toBeInTheDocument();

      // Check that descriptions are rendered
      expect(screen.getByDisplayValue('Description 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Description 2')).toBeInTheDocument();

      // Check that icon picker buttons are present (one per feature)
      const iconButtons = screen.getAllByRole('button', { name: /select icon/i });
      expect(iconButtons.length).toBe(2);
    });

    /**
     * Test 2: FeatureFormEditor add/remove feature functionality
     */
    it('handles add and remove feature functionality', async () => {
      const mockFeatures: WhitelabelFeature[] = [
        { title: 'Feature 1', description: 'Description 1', icon: 'Zap' },
      ];
      const mockOnChange = vi.fn();

      const { FeatureFormEditor } = await import('@/components/admin/FeatureFormEditor');

      const Wrapper = createWrapper();
      render(
        <FeatureFormEditor features={mockFeatures} onChange={mockOnChange} />,
        { wrapper: Wrapper }
      );

      // Click add feature button
      const addButton = screen.getByRole('button', { name: /add feature/i });
      fireEvent.click(addButton);

      // Verify onChange was called with new feature added
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ title: 'Feature 1' }),
            expect.objectContaining({ title: '', description: '', icon: 'Zap' }),
          ])
        );
      });
    });

    /**
     * Test 3: FeatureFormEditor remove feature functionality
     */
    it('handles remove feature functionality', async () => {
      const mockFeatures: WhitelabelFeature[] = [
        { title: 'Feature 1', description: 'Description 1', icon: 'Zap' },
        { title: 'Feature 2', description: 'Description 2', icon: 'Star' },
      ];
      const mockOnChange = vi.fn();

      const { FeatureFormEditor } = await import('@/components/admin/FeatureFormEditor');

      const Wrapper = createWrapper();
      render(
        <FeatureFormEditor features={mockFeatures} onChange={mockOnChange} />,
        { wrapper: Wrapper }
      );

      // Click remove button on first feature
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      // Verify onChange was called with feature removed (only Feature 2 remains)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          expect.objectContaining({ title: 'Feature 2', description: 'Description 2' }),
        ]);
      });
    });

    /**
     * Test: FeatureFormEditor updates feature fields on input change
     */
    it('updates feature fields when user types in inputs', async () => {
      const mockFeatures: WhitelabelFeature[] = [
        { title: 'Feature 1', description: 'Description 1', icon: 'Zap' },
      ];
      const mockOnChange = vi.fn();

      const { FeatureFormEditor } = await import('@/components/admin/FeatureFormEditor');

      const Wrapper = createWrapper();
      render(
        <FeatureFormEditor features={mockFeatures} onChange={mockOnChange} />,
        { wrapper: Wrapper }
      );

      // Find the title input and change it
      const titleInput = screen.getByDisplayValue('Feature 1');
      fireEvent.change(titleInput, { target: { value: 'Updated Feature Title' } });

      // Verify onChange was called with updated title
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          expect.objectContaining({ title: 'Updated Feature Title' }),
        ]);
      });
    });
  });

  /**
   * Test 4: TestimonialFormEditor renders testimonial rows
   */
  describe('TestimonialFormEditor', () => {
    it('renders testimonial rows with quote, author, role, and image URL', async () => {
      const mockTestimonials: WhitelabelTestimonial[] = [
        { quote: 'Great product!', author: 'John Doe', role: 'CEO', image: 'https://example.com/avatar.jpg' },
        { quote: 'Amazing tool!', author: 'Jane Smith', role: 'CTO' },
      ];
      const mockOnChange = vi.fn();

      const { TestimonialFormEditor } = await import('@/components/admin/TestimonialFormEditor');

      const Wrapper = createWrapper();
      render(
        <TestimonialFormEditor testimonials={mockTestimonials} onChange={mockOnChange} />,
        { wrapper: Wrapper }
      );

      // Check that testimonial quotes are rendered
      expect(screen.getByDisplayValue('Great product!')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Amazing tool!')).toBeInTheDocument();

      // Check that author names are rendered
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();

      // Check that roles are rendered
      expect(screen.getByDisplayValue('CEO')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CTO')).toBeInTheDocument();

      // Check for add testimonial button
      expect(screen.getByRole('button', { name: /add testimonial/i })).toBeInTheDocument();
    });
  });

  /**
   * Test 5: FAQFormEditor renders FAQ rows with markdown preview
   */
  describe('FAQFormEditor', () => {
    it('renders FAQ rows with question, answer, and preview toggle', async () => {
      const mockFaq: WhitelabelFAQ[] = [
        { question: 'What is this?', answer: 'A **great** tool!' },
        { question: 'How does it work?', answer: 'Very well!' },
      ];
      const mockOnChange = vi.fn();

      const { FAQFormEditor } = await import('@/components/admin/FAQFormEditor');

      const Wrapper = createWrapper();
      render(
        <FAQFormEditor faq={mockFaq} onChange={mockOnChange} />,
        { wrapper: Wrapper }
      );

      // Check that questions are rendered
      expect(screen.getByDisplayValue('What is this?')).toBeInTheDocument();
      expect(screen.getByDisplayValue('How does it work?')).toBeInTheDocument();

      // Check that answers are rendered
      expect(screen.getByDisplayValue('A **great** tool!')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Very well!')).toBeInTheDocument();

      // Check for preview toggle buttons (2 FAQ items = at least 2 buttons with "Preview")
      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      expect(previewButtons.length).toBeGreaterThanOrEqual(2);

      // Check for add FAQ button
      expect(screen.getByRole('button', { name: /add faq/i })).toBeInTheDocument();

      // Check for markdown hints (each FAQ has a hint, use getAllByText since there are multiple)
      const markdownHints = screen.getAllByText(/supports markdown/i);
      expect(markdownHints.length).toBeGreaterThanOrEqual(1);
    });

    /**
     * Test: FAQFormEditor preview toggle shows markdown rendered content
     */
    it('toggles markdown preview when preview button is clicked', async () => {
      const mockFaq: WhitelabelFAQ[] = [
        { question: 'What is this?', answer: 'A **bold** statement' },
      ];
      const mockOnChange = vi.fn();

      const { FAQFormEditor } = await import('@/components/admin/FAQFormEditor');

      const Wrapper = createWrapper();
      render(
        <FAQFormEditor faq={mockFaq} onChange={mockOnChange} />,
        { wrapper: Wrapper }
      );

      // Find and click the preview toggle button
      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);

      // After clicking preview, the markdown should be rendered
      // The bold text should appear as rendered
      await waitFor(() => {
        // Look for the rendered bold text
        const boldElement = screen.queryByText('bold');
        // Either the text exists in preview or we see "Hide Preview" button
        const hideButton = screen.queryByRole('button', { name: /hide/i });
        expect(boldElement || hideButton).toBeTruthy();
      });
    });
  });

  /**
   * Test 6: LogoUploader integration in WhitelabelEditor
   */
  describe('LogoUploader Integration', () => {
    it('renders LogoUploader components for light and dark logos', async () => {
      const { LogoUploader } = await import('@/components/admin/LogoUploader');

      const mockOnChange = vi.fn();
      const Wrapper = createWrapper();

      render(
        <div>
          <LogoUploader
            value="https://example.com/light-logo.png"
            onChange={mockOnChange}
            label="Light Logo"
          />
          <LogoUploader
            value="https://example.com/dark-logo.png"
            onChange={mockOnChange}
            label="Dark Logo"
          />
        </div>,
        { wrapper: Wrapper }
      );

      // Check that both logo uploaders are rendered with labels
      expect(screen.getByText('Light Logo')).toBeInTheDocument();
      expect(screen.getByText('Dark Logo')).toBeInTheDocument();

      // Check for recommended size hints
      const sizeHints = screen.getAllByText(/200x50px/i);
      expect(sizeHints.length).toBe(2);

      // Check for upload buttons
      const uploadButtons = screen.getAllByRole('button', { name: /upload/i });
      expect(uploadButtons.length).toBe(2);

      // Check that URL inputs have the correct values
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.some(input => (input as HTMLInputElement).value === 'https://example.com/light-logo.png')).toBe(true);
      expect(inputs.some(input => (input as HTMLInputElement).value === 'https://example.com/dark-logo.png')).toBe(true);
    });
  });
});
