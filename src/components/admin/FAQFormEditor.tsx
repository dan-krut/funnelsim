import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, AlertCircle, Eye, EyeOff } from "lucide-react";
import { MarkdownPreview } from "@/components/admin/MarkdownPreview";
import type { WhitelabelFAQ } from "@/integrations/supabase/types";

interface FAQFormEditorProps {
  /** Array of FAQ items to edit */
  faq: WhitelabelFAQ[];
  /** Callback when FAQ changes */
  onChange: (faq: WhitelabelFAQ[]) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/**
 * FAQFormEditor component for editing landing page FAQ items.
 * Provides a form-based interface with question and answer fields.
 * Includes markdown preview toggle for answers.
 */
export const FAQFormEditor = ({
  faq,
  onChange,
  disabled = false,
}: FAQFormEditorProps) => {
  // Track which FAQ items have preview enabled
  const [previewStates, setPreviewStates] = useState<Record<number, boolean>>({});

  /**
   * Updates a specific field in a FAQ item at the given index.
   */
  const handleFieldChange = (
    index: number,
    field: keyof WhitelabelFAQ,
    value: string
  ) => {
    const updated = [...faq];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  /**
   * Adds a new empty FAQ item to the list.
   */
  const handleAddFAQ = () => {
    const newFAQ: WhitelabelFAQ = {
      question: "",
      answer: "",
    };
    onChange([...faq, newFAQ]);
  };

  /**
   * Removes a FAQ item at the given index.
   */
  const handleRemoveFAQ = (index: number) => {
    const updated = faq.filter((_, i) => i !== index);
    onChange(updated);

    // Clean up preview state for removed item
    setPreviewStates((prev) => {
      const next = { ...prev };
      delete next[index];
      // Reindex remaining items
      const reindexed: Record<number, boolean> = {};
      Object.keys(next).forEach((key) => {
        const oldIndex = parseInt(key);
        if (oldIndex > index) {
          reindexed[oldIndex - 1] = next[oldIndex];
        } else {
          reindexed[oldIndex] = next[oldIndex];
        }
      });
      return reindexed;
    });
  };

  /**
   * Toggles the preview state for a FAQ item.
   */
  const togglePreview = (index: number) => {
    setPreviewStates((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  /**
   * Validates if a FAQ item has required fields filled.
   */
  const isFAQValid = (item: WhitelabelFAQ): boolean => {
    return item.question.trim() !== "" && item.answer.trim() !== "";
  };

  return (
    <div className="space-y-4">
      {faq.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="mb-2">No FAQ items added yet.</p>
          <p className="text-sm">Click "Add FAQ" to create your first FAQ item.</p>
        </div>
      )}

      {faq.map((item, index) => {
        const isValid = isFAQValid(item);
        const showPreview = previewStates[index] || false;

        return (
          <Card key={index} className={!isValid && (item.question !== "" || item.answer !== "") ? "border-amber-500" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`faq-question-${index}`}>
                      Question <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`faq-question-${index}`}
                      value={item.question}
                      onChange={(e) => handleFieldChange(index, "question", e.target.value)}
                      placeholder="e.g., What is FunnelSim?"
                      disabled={disabled}
                      aria-label={`FAQ ${index + 1} question`}
                    />
                    {!item.question.trim() && item.answer.trim() && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Question is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`faq-answer-${index}`}>
                        Answer <span className="text-destructive">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePreview(index)}
                        disabled={disabled}
                        className="h-7 px-2"
                        aria-label={showPreview ? "Hide preview" : "Show preview"}
                      >
                        {showPreview ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide Preview
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </>
                        )}
                      </Button>
                    </div>

                    {showPreview ? (
                      <div className="border rounded-md p-4 bg-muted/50 min-h-[100px]">
                        <MarkdownPreview content={item.answer} />
                      </div>
                    ) : (
                      <Textarea
                        id={`faq-answer-${index}`}
                        value={item.answer}
                        onChange={(e) => handleFieldChange(index, "answer", e.target.value)}
                        placeholder="Enter your answer here. You can use markdown formatting..."
                        disabled={disabled}
                        rows={4}
                        aria-label={`FAQ ${index + 1} answer`}
                      />
                    )}

                    {!item.answer.trim() && item.question.trim() && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Answer is required
                      </p>
                    )}

                    {!showPreview && (
                      <p className="text-xs text-muted-foreground">
                        Supports markdown: **bold**, *italic*, [links](url), and lists (- item)
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFAQ(index)}
                  disabled={disabled}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove FAQ"
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
        onClick={handleAddFAQ}
        disabled={disabled}
        className="w-full"
        aria-label="Add FAQ"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add FAQ
      </Button>
    </div>
  );
};

export default FAQFormEditor;
