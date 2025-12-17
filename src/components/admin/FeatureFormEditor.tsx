import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, AlertCircle } from "lucide-react";
import { IconPicker } from "@/components/admin/IconPicker";
import type { WhitelabelFeature } from "@/integrations/supabase/types";

interface FeatureFormEditorProps {
  /** Array of features to edit */
  features: WhitelabelFeature[];
  /** Callback when features change */
  onChange: (features: WhitelabelFeature[]) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/**
 * FeatureFormEditor component for editing landing page features.
 * Provides a form-based interface with icon picker, title, and description fields.
 * Allows adding and removing features.
 */
export const FeatureFormEditor = ({
  features,
  onChange,
  disabled = false,
}: FeatureFormEditorProps) => {
  /**
   * Updates a specific field in a feature at the given index.
   */
  const handleFieldChange = (
    index: number,
    field: keyof WhitelabelFeature,
    value: string
  ) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  /**
   * Adds a new empty feature to the list.
   */
  const handleAddFeature = () => {
    const newFeature: WhitelabelFeature = {
      title: "",
      description: "",
      icon: "Zap", // Default icon
    };
    onChange([...features, newFeature]);
  };

  /**
   * Removes a feature at the given index.
   */
  const handleRemoveFeature = (index: number) => {
    const updated = features.filter((_, i) => i !== index);
    onChange(updated);
  };

  /**
   * Validates if a feature has required fields filled.
   */
  const isFeatureValid = (feature: WhitelabelFeature): boolean => {
    return feature.title.trim() !== "" && feature.description.trim() !== "";
  };

  return (
    <div className="space-y-4">
      {features.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="mb-2">No features added yet.</p>
          <p className="text-sm">Click "Add Feature" to create your first feature.</p>
        </div>
      )}

      {features.map((feature, index) => {
        const isValid = isFeatureValid(feature);
        return (
          <Card key={index} className={!isValid && feature.title !== "" ? "border-amber-500" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-48">
                  <IconPicker
                    value={feature.icon || "Zap"}
                    onChange={(icon) => handleFieldChange(index, "icon", icon)}
                    disabled={disabled}
                    label="Icon"
                  />
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`feature-title-${index}`}>
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`feature-title-${index}`}
                      value={feature.title}
                      onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                      placeholder="e.g., Visual Flow Builder"
                      disabled={disabled}
                      aria-label={`Feature ${index + 1} title`}
                    />
                    {!feature.title.trim() && feature.description.trim() && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Title is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`feature-description-${index}`}>
                      Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id={`feature-description-${index}`}
                      value={feature.description}
                      onChange={(e) => handleFieldChange(index, "description", e.target.value)}
                      placeholder="Describe the feature in detail..."
                      disabled={disabled}
                      rows={2}
                      aria-label={`Feature ${index + 1} description`}
                    />
                    {!feature.description.trim() && feature.title.trim() && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Description is required
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFeature(index)}
                  disabled={disabled}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove feature"
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
        onClick={handleAddFeature}
        disabled={disabled}
        className="w-full"
        aria-label="Add feature"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Feature
      </Button>
    </div>
  );
};

export default FeatureFormEditor;
