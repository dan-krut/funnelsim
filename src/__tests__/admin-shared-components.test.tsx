/**
 * Admin Shared Components Test Suite
 * Tests for IconPicker, MarkdownPreview, LogoUploader, and ConfirmationDialog components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'whitelabel/test-image.png' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/funnel-logos/whitelabel/test-image.png' } }),
    })),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('Admin Shared Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('IconPicker Component', () => {
    it('should render icon grid and handle selection', async () => {
      const { IconPicker } = await import('@/components/admin/IconPicker');
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<IconPicker value="Zap" onChange={onChange} />);

      // Should show the current icon in the trigger button
      const triggerButton = screen.getByRole('button', { name: /select icon/i });
      expect(triggerButton).toBeInTheDocument();

      // Click to open popover
      await user.click(triggerButton);

      // Wait for popover content to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search icons/i)).toBeInTheDocument();
      });

      // Should display icon grid
      const calculatorIcon = screen.getByRole('button', { name: /calculator/i });
      expect(calculatorIcon).toBeInTheDocument();

      // Click on an icon to select it
      await user.click(calculatorIcon);

      // Should call onChange with selected icon name
      expect(onChange).toHaveBeenCalledWith('Calculator');
    });

    it('should filter icons based on search input', async () => {
      const { IconPicker } = await import('@/components/admin/IconPicker');
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<IconPicker value="Zap" onChange={onChange} />);

      // Open the popover
      const triggerButton = screen.getByRole('button', { name: /select icon/i });
      await user.click(triggerButton);

      // Wait for search input
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search icons/i)).toBeInTheDocument();
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText(/search icons/i);
      await user.type(searchInput, 'calc');

      // Should filter to only show matching icons
      await waitFor(() => {
        const calculatorButton = screen.getByRole('button', { name: /calculator/i });
        expect(calculatorButton).toBeInTheDocument();
      });
    });
  });

  describe('MarkdownPreview Component', () => {
    it('should render markdown content correctly', async () => {
      const { MarkdownPreview } = await import('@/components/admin/MarkdownPreview');

      const markdownContent = '**Bold text** and *italic text* with a [link](https://example.com)';

      render(<MarkdownPreview content={markdownContent} />);

      // Check that bold text is rendered
      const boldElement = screen.getByText('Bold text');
      expect(boldElement.tagName.toLowerCase()).toBe('strong');

      // Check that italic text is rendered
      const italicElement = screen.getByText('italic text');
      expect(italicElement.tagName.toLowerCase()).toBe('em');

      // Check that link is rendered correctly
      const linkElement = screen.getByRole('link', { name: 'link' });
      expect(linkElement).toHaveAttribute('href', 'https://example.com');
    });

    it('should render lists correctly', async () => {
      const { MarkdownPreview } = await import('@/components/admin/MarkdownPreview');

      const markdownContent = `- Item 1
- Item 2
- Item 3`;

      render(<MarkdownPreview content={markdownContent} />);

      // Check that list items are rendered
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });
  });

  describe('LogoUploader Component', () => {
    it('should handle URL input mode', async () => {
      const { LogoUploader } = await import('@/components/admin/LogoUploader');
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <LogoUploader
          value={null}
          onChange={onChange}
          label="Light Logo"
        />
      );

      // Should show URL input
      const urlInput = screen.getByPlaceholderText(/https:\/\//i);
      expect(urlInput).toBeInTheDocument();

      // Should show recommended size hint
      expect(screen.getByText(/recommended: 200x50px/i)).toBeInTheDocument();

      // Type a URL
      await user.type(urlInput, 'https://example.com/logo.png');

      // Should call onChange (debounced, so we need to wait)
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('https://example.com/logo.png');
      }, { timeout: 1000 });
    });

    it('should show image preview when URL is provided', async () => {
      const { LogoUploader } = await import('@/components/admin/LogoUploader');
      const onChange = vi.fn();

      render(
        <LogoUploader
          value="https://example.com/existing-logo.png"
          onChange={onChange}
          label="Light Logo"
        />
      );

      // Should show the preview image
      const previewImage = screen.getByAltText(/light logo preview/i);
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', 'https://example.com/existing-logo.png');
    });

    it('should have upload button for file upload', async () => {
      const { LogoUploader } = await import('@/components/admin/LogoUploader');
      const onChange = vi.fn();

      render(
        <LogoUploader
          value={null}
          onChange={onChange}
          label="Dark Logo"
        />
      );

      // Should show upload button
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      expect(uploadButton).toBeInTheDocument();
    });
  });

  describe('ConfirmationDialog Component', () => {
    it('should display content and handle confirm action', async () => {
      const { ConfirmationDialog } = await import('@/components/admin/ConfirmationDialog');
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const user = userEvent.setup();

      render(
        <ConfirmationDialog
          open={true}
          title="Delete Item"
          description="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          onConfirm={onConfirm}
          onCancel={onCancel}
          destructive={true}
        />
      );

      // Should display title and description
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete this item/i)).toBeInTheDocument();

      // Should have confirm and cancel buttons
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();

      // Click confirm
      await user.click(confirmButton);
      expect(onConfirm).toHaveBeenCalled();
    });

    it('should handle cancel action', async () => {
      const { ConfirmationDialog } = await import('@/components/admin/ConfirmationDialog');
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const user = userEvent.setup();

      render(
        <ConfirmationDialog
          open={true}
          title="Confirm Action"
          description="Please confirm this action."
          confirmText="Confirm"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
