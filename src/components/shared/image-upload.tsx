"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  maxSizeMB?: number;
  /** Aspect hint for the preview — "square" or "banner" */
  aspect?: "square" | "banner";
  className?: string;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";

export function ImageUpload({
  value,
  onChange,
  label = "Upload Image",
  placeholder,
  maxSizeMB = 2,
  aspect = "square",
  className = "",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Client-side validation
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum ${maxSizeMB}MB`);
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }

        const { url } = await res.json();
        setImgError(false);
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [maxSizeMB, onChange]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange("");
    setError(null);
    setImgError(false);
  };

  const initials = placeholder
    ? placeholder
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const isSquare = aspect === "square";
  const previewCls = isSquare
    ? "size-20 rounded-xl"
    : "h-32 w-full rounded-xl";

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleInputChange}
      />

      <div className="flex items-start gap-3">
        {/* Preview / placeholder */}
        {value && !imgError ? (
          <div className={`relative overflow-hidden border bg-muted/30 ${previewCls}`}>
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={uploading}
            className={`flex items-center justify-center border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary/40 hover:bg-primary/5 ${previewCls}`}
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-primary" />
            ) : initials ? (
              <span className="text-lg font-bold text-muted-foreground/50">
                {initials}
              </span>
            ) : (
              <Upload className="size-6 text-muted-foreground/40" />
            )}
          </button>
        )}

        {/* Upload button + info */}
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={uploading}
            className="gap-1.5"
          >
            {uploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading...
              </>
            ) : value ? (
              <>
                <Upload className="size-3.5" />
                Replace
              </>
            ) : (
              <>
                <Upload className="size-3.5" />
                {label}
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            PNG, JPG, WebP, SVG. Max {maxSizeMB}MB
          </p>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-left text-[11px] text-destructive hover:underline"
            >
              Remove image
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
