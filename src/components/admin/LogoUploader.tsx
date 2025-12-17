import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LogoUploaderProps {
  /** Current logo URL value */
  value: string | null;
  /** Callback when URL changes (either from input or upload) */
  onChange: (url: string | null) => void;
  /** Label for the uploader */
  label: string;
  /** Storage bucket name (defaults to funnel-logos) */
  bucket?: string;
  /** Whether the uploader is disabled */
  disabled?: boolean;
  /** Recommended image size hint (defaults to "200x50px") */
  recommendedSize?: string;
}

/**
 * LogoUploader component for uploading logo images or entering URLs.
 * Supports both URL input and direct file upload to Supabase Storage.
 * Shows image preview and upload progress.
 */
export const LogoUploader = ({
  value,
  onChange,
  label,
  bucket = "funnel-logos",
  disabled = false,
  recommendedSize = "200x50px",
}: LogoUploaderProps) => {
  const [urlInput, setUrlInput] = useState(value || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync urlInput with value prop
  useEffect(() => {
    setUrlInput(value || "");
  }, [value]);

  // Debounced URL input change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only update if the value has actually changed
      if (urlInput !== (value || "")) {
        onChange(urlInput || null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [urlInput]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
    setImageError(false);
    setUploadError(null);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File size must be less than 2MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const fileName = `whitelabel/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      // Simulate progress (Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setUploadProgress(100);

      // Update the URL
      const publicUrl = urlData.publicUrl;
      setUrlInput(publicUrl);
      onChange(publicUrl);

      // Reset progress after a short delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error: any) {
      setUploadError(error.message || "Failed to upload file");
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    setUrlInput("");
    onChange(null);
    setImageError(false);
    setUploadError(null);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const isDarkLabel = label.toLowerCase().includes("dark");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">
          Recommended: {recommendedSize}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="url"
            value={urlInput}
            onChange={handleUrlChange}
            placeholder="https://..."
            disabled={disabled || isUploading}
            className="pr-8"
            aria-label={`${label} URL`}
          />
          {urlInput && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={handleClear}
              disabled={disabled || isUploading}
              aria-label="Clear URL"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleFileSelect}
          disabled={disabled || isUploading}
          aria-label="Upload"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="File input"
        />
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}

      {/* Image preview */}
      {urlInput && !isUploading && (
        <div
          className={cn(
            "p-4 rounded border flex items-center justify-center min-h-[80px]",
            isDarkLabel ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
          )}
        >
          {imageError ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">Failed to load image</span>
            </div>
          ) : (
            <img
              src={urlInput}
              alt={`${label} preview`}
              className="h-8 object-contain max-w-full"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default LogoUploader;
