import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  /** Markdown content to render */
  content: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Simple markdown to HTML parser.
 * Supports: bold, italic, links, unordered lists, and paragraphs.
 * Uses regex-based parsing for simplicity and security (no external library needed).
 */
function parseMarkdown(markdown: string): string {
  if (!markdown) return "";

  let html = markdown;

  // Escape HTML entities first to prevent XSS
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Convert markdown to HTML

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_ (but not inside links or already processed bold)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>'
  );

  // Unordered lists: lines starting with - or *
  const lines = html.split("\n");
  let inList = false;
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^[\-\*]\s+(.+)$/);

    if (listMatch) {
      if (!inList) {
        processedLines.push('<ul class="list-disc list-inside space-y-1 my-2">');
        inList = true;
      }
      processedLines.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        processedLines.push("</ul>");
        inList = false;
      }

      // Handle empty lines as paragraph breaks
      if (line.trim() === "") {
        processedLines.push("");
      } else {
        processedLines.push(line);
      }
    }
  }

  if (inList) {
    processedLines.push("</ul>");
  }

  html = processedLines.join("\n");

  // Wrap non-list, non-empty lines in paragraphs
  // Split by double newlines for paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      // Don't wrap if already wrapped in HTML tags
      if (trimmed.startsWith("<ul") || trimmed.startsWith("<li") || trimmed.startsWith("<p")) {
        return trimmed;
      }
      // Replace single newlines with <br> within paragraphs
      const withBreaks = trimmed.replace(/\n/g, "<br>");
      return `<p>${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

/**
 * MarkdownPreview component for rendering markdown content as HTML.
 * Supports basic markdown syntax: bold, italic, links, lists, and paragraphs.
 * Matches landing page text styling for consistency.
 */
export const MarkdownPreview = ({ content, className }: MarkdownPreviewProps) => {
  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

  if (!content) {
    return (
      <div className={cn("text-muted-foreground text-sm italic", className)}>
        No content to preview
      </div>
    );
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "text-foreground",
        "[&_p]:mb-2 [&_p]:leading-relaxed",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic [&_em]:text-foreground",
        "[&_ul]:my-2 [&_li]:text-foreground",
        "[&_a]:text-primary [&_a]:underline [&_a]:hover:no-underline",
        className
      )}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownPreview;
