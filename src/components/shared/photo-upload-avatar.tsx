"use client";

import * as React from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Shared avatar + click-to-upload control used on student/teacher profile headers — reuses the
 * app's existing file-upload pipeline (FormData -> Server Action -> uploadedFilesService), the
 * same pattern already established for homework/receipt uploads. Shows an instant local preview
 * (object URL) so the new photo appears without waiting for a full page reload, even though the
 * Server Action's own revalidatePath keeps the next real load correct too. */
export function PhotoUploadAvatar({
  photoUrl,
  fallbackText,
  size = "h-16 w-16",
  editable,
  onUpload,
}: {
  photoUrl: string | null;
  fallbackText: string;
  size?: string;
  editable: boolean;
  onUpload: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await onUpload(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        setPreview(null);
      } else {
        toast.success("Photo updated");
      }
    } catch {
      toast.error("Could not upload photo.");
      setPreview(null);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="group relative shrink-0">
      <Avatar className={size}>
        <AvatarImage src={preview ?? photoUrl ?? undefined} alt={fallbackText} />
        <AvatarFallback className="text-lg">{fallbackText}</AvatarFallback>
      </Avatar>
      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            aria-label="Change photo"
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-full text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100",
              pending && "bg-black/40 opacity-100"
            )}
          >
            <Camera className="h-5 w-5" />
          </button>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
        </>
      )}
    </div>
  );
}
