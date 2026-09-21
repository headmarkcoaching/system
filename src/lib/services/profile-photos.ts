import "server-only";
import * as uploadedFilesService from "@/lib/services/uploaded-files";
import { FileValidationError } from "@/lib/services/uploaded-files";

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Uploads a profile photo through the same storage abstraction (local disk / Google Drive)
 * as every other file in the app, and returns the URL to store on the owning record's
 * `photoUrl` field — `/api/files/{id}`, served by the existing PROFILE_PHOTO-aware route. */
export async function uploadProfilePhoto(input: { file: File; uploadedById: string }): Promise<string> {
  if (!IMAGE_MIME_TYPES.includes(input.file.type)) {
    throw new FileValidationError("Profile photos must be a PNG, JPEG, or WEBP image.");
  }

  const uploaded = await uploadedFilesService.uploadFile({ file: input.file, purpose: "PROFILE_PHOTO", uploadedById: input.uploadedById });
  return `/api/files/${uploaded.id}`;
}
