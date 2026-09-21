import "server-only";
import { db } from "@/lib/db";
import type { FilePurpose } from "@prisma/client";
import { getFileStorageProvider, getFileStorageProviderByName } from "@/lib/storage";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export class FileValidationError extends Error {}

/** Signature bytes for each allowed type — checked against the real file content, not just the
 * client-supplied `file.type`. Found during a security review: the browser's declared MIME type
 * is trivial for a caller to spoof (rename a file, or skip the browser and hit the server
 * action directly), and this file's bytes are later served back with that same claimed type in
 * `Content-Type` — so without this check, a mislabeled upload could reach a browser as
 * attacker-chosen content under a "safe" extension. */
function matchesSignature(buffer: Buffer, mimeType: string): boolean {
  const hex = (offset: number, length: number) => buffer.subarray(offset, offset + length).toString("hex");
  switch (mimeType) {
    case "application/pdf":
      return hex(0, 4) === "25504446"; // %PDF
    case "image/png":
      return hex(0, 8) === "89504e470d0a1a0a";
    case "image/jpeg":
      return hex(0, 3) === "ffd8ff";
    case "image/webp":
      return hex(0, 4) === "52494646" && buffer.subarray(8, 12).toString("ascii") === "WEBP"; // RIFF....WEBP
    case "application/msword":
      return hex(0, 8) === "d0cf11e0a1b11ae1"; // legacy OLE compound file
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return hex(0, 4) === "504b0304"; // .docx is a zip archive (PK\x03\x04)
    default:
      return false;
  }
}

export async function uploadFile(input: { file: File; purpose: FilePurpose; uploadedById: string }) {
  if (input.file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileValidationError(`File is too large — maximum ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`);
  }
  if (!ALLOWED_MIME_TYPES.includes(input.file.type)) {
    throw new FileValidationError("Unsupported file type. Allowed: PDF, Word documents, PNG, JPEG, WEBP.");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  if (!matchesSignature(buffer, input.file.type)) {
    throw new FileValidationError("This file's content doesn't match its claimed type — upload rejected.");
  }

  const provider = await getFileStorageProvider();
  const handle = await provider.save({ filename: input.file.name, mimeType: input.file.type, buffer });

  return db.uploadedFile.create({
    data: {
      filename: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      storageProvider: handle.storageProvider,
      storagePath: handle.storagePath,
      purpose: input.purpose,
      uploadedById: input.uploadedById,
    },
  });
}

export function getUploadedFile(id: string) {
  return db.uploadedFile.findUnique({ where: { id } });
}

export async function readFileBytes(id: string) {
  const file = await getUploadedFile(id);
  if (!file) return null;
  // Must dispatch on the provider this specific file was saved through, not whatever's
  // currently active — otherwise switching providers breaks every file uploaded under the old one.
  const provider = getFileStorageProviderByName(file.storageProvider);
  const buffer = await provider.read(file.storagePath);
  return { file, buffer };
}
