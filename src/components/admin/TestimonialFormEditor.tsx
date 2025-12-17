import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, AlertCircle, User } from "lucide-react";
import type { WhitelabelTestimonial } from "@/integrations/supabase/types";

interface TestimonialFormEditorProps {
  /** Array of testimonials to edit */
  testimonials: WhitelabelTestimonial[];
  /** Callback when testimonials change */
  onChange: (testimonials: WhitelabelTestimonial[]) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/**
 * TestimonialFormEditor component for editing landing page testimonials.
 * Provides a form-based interface with quote, author, role, and image URL fields.
 * Shows avatar preview from URL.
 */
export const TestimonialFormEditor = ({
  testimonials,
  onChange,
  disabled = false,
}: TestimonialFormEditorProps) => {
  /**
   * Updates a specific field in a testimonial at the given index.
   */
  const handleFieldChange = (
    index: number,
    field: keyof WhitelabelTestimonial,
    value: string
  ) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  /**
   * Adds a new empty testimonial to the list.
   */
  const handleAddTestimonial = () => {
    const newTestimonial: WhitelabelTestimonial = {
      quote: "",
      author: "",
      role: "",
      image: null,
    };
    onChange([...testimonials, newTestimonial]);
  };

  /**
   * Removes a testimonial at the given index.
   */
  const handleRemoveTestimonial = (index: number) => {
    const updated = testimonials.filter((_, i) => i !== index);
    onChange(updated);
  };

  /**
   * Validates if a testimonial has required fields filled.
   */
  const isTestimonialValid = (testimonial: WhitelabelTestimonial): boolean => {
    return testimonial.quote.trim() !== "" && testimonial.author.trim() !== "";
  };

  return (
    <div className="space-y-4">
      {testimonials.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="mb-2">No testimonials added yet.</p>
          <p className="text-sm">Click "Add Testimonial" to create your first testimonial.</p>
        </div>
      )}

      {testimonials.map((testimonial, index) => {
        const isValid = isTestimonialValid(testimonial);
        return (
          <Card key={index} className={!isValid && (testimonial.quote !== "" || testimonial.author !== "") ? "border-amber-500" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                {/* Avatar Preview */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                    {testimonial.image ? (
                      <img
                        src={testimonial.image}
                        alt={`${testimonial.author || "Author"} avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <User className={`h-8 w-8 text-muted-foreground ${testimonial.image ? "hidden" : ""}`} />
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`testimonial-quote-${index}`}>
                      Quote <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id={`testimonial-quote-${index}`}
                      value={testimonial.quote}
                      onChange={(e) => handleFieldChange(index, "quote", e.target.value)}
                      placeholder="e.g., This tool changed everything for our business..."
                      disabled={disabled}
                      rows={3}
                      aria-label={`Testimonial ${index + 1} quote`}
                    />
                    {!testimonial.quote.trim() && testimonial.author.trim() && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Quote is required
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`testimonial-author-${index}`}>
                        Author <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`testimonial-author-${index}`}
                        value={testimonial.author}
                        onChange={(e) => handleFieldChange(index, "author", e.target.value)}
                        placeholder="e.g., John Doe"
                        disabled={disabled}
                        aria-label={`Testimonial ${index + 1} author`}
                      />
                      {!testimonial.author.trim() && testimonial.quote.trim() && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Author is required
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`testimonial-role-${index}`}>Role</Label>
                      <Input
                        id={`testimonial-role-${index}`}
                        value={testimonial.role || ""}
                        onChange={(e) => handleFieldChange(index, "role", e.target.value)}
                        placeholder="e.g., CEO, Founder"
                        disabled={disabled}
                        aria-label={`Testimonial ${index + 1} role`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`testimonial-image-${index}`}>Image URL</Label>
                    <Input
                      id={`testimonial-image-${index}`}
                      value={testimonial.image || ""}
                      onChange={(e) => handleFieldChange(index, "image", e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      disabled={disabled}
                      type="url"
                      aria-label={`Testimonial ${index + 1} image URL`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use a square image for best results. URL to an avatar or profile photo.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTestimonial(index)}
                  disabled={disabled}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove testimonial"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddTestimonial}
        disabled={disabled}
        className="w-full"
        aria-label="Add testimonial"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Testimonial
      </Button>
    </div>
  );
};

export default TestimonialFormEditor;
