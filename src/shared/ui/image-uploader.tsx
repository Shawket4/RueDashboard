import * as React from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "./button";

interface ImageUploaderProps {
  /** Current image URL (null when no image) */
  value: string | null | undefined;
  /** Called when the user picks a file. The caller performs the upload and
   *  returns the new URL (or throws to surface an error). */
  onUpload: (file: File) => Promise<string>;
  /** Called when the user clicks the remove button */
  onRemove?: () => Promise<void> | void;
  /** Extra hint text shown under the drop zone */
  hint?: string;
  /** Allowed MIME types (defaults to common image formats) */
  accept?: string;
  /** Max file size in bytes (default 5 MB) */
  maxBytes?: number;
  /** Square aspect ratio (default) — set false for 16:9 style banners */
  square?: boolean;
  disabled?: boolean;
}

/**
 * Uniform image upload UI used by menu items, org logos, user avatars, etc.
 *
 * The component owns preview + progress state; the caller owns the actual
 * upload RPC. This lets each entity target its own `/uploads/...` endpoint
 * without duplicating the drag-drop / validation / preview logic.
 */
export function ImageUploader({
  value,
  onUpload,
  onRemove,
  hint,
  accept = "image/png,image/jpeg,image/webp",
  maxBytes = 5 * 1024 * 1024,
  square = true,
  disabled = false,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);

    // Cheap client-side validation so we don't waste an upload round-trip
    if (!file.type.startsWith("image/")) {
      setError(t("uploader.notAnImage", { defaultValue: "That's not an image file" }));
      return;
    }
    if (file.size > maxBytes) {
      setError(t("uploader.tooLarge", {
        defaultValue: "Image is larger than {{mb}} MB",
        mb: Math.round(maxBytes / (1024 * 1024)),
      }));
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setRemoving(true);
    setError(null);
    try {
      await onRemove();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemoving(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors overflow-hidden",
          square ? "aspect-square" : "aspect-video",
          "max-w-[200px]",
          isDragging ? "border-primary bg-primary/5" : "border-input",
          disabled && "opacity-50",
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 hover:opacity-100">
                <Button
                  type="button"
                  size="iconSm"
                  variant="secondary"
                  onClick={() => inputRef.current?.click()}
                  loading={uploading}
                  aria-label={t("uploader.replace", { defaultValue: "Replace image" })}
                >
                  <Upload />
                </Button>
                {onRemove && (
                  <Button
                    type="button"
                    size="iconSm"
                    variant="destructive"
                    onClick={handleRemove}
                    loading={removing}
                    aria-label={t("uploader.remove", { defaultValue: "Remove image" })}
                  >
                    <X />
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <ImageIcon size={22} />
            )}
            <span className="text-xs font-medium">
              {uploading
                ? t("uploader.uploading", { defaultValue: "Uploading…" })
                : t("uploader.choose", { defaultValue: "Upload image" })}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // Clear so the same file can be picked again after a failure
          e.target.value = "";
        }}
        className="hidden"
      />

      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}