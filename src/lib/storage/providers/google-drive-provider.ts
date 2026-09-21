import "server-only";
import type { FileStorageProvider, StoredFileHandle } from "@/lib/storage/provider";
import { getGoogleCredentials, getGoogleAccessToken } from "@/lib/google/oauth";

/**
 * Google Drive storage provider — plain fetch calls against Drive API v3 (no googleapis SDK,
 * same lightweight style as every other provider in this app). Uses the `drive.file` scope
 * (the same Google connection that powers Google Meet — see src/lib/google/oauth.ts), which
 * only grants access to files this app itself creates, not the connected account's whole Drive.
 *
 * `storagePath` stores the Drive file id (not a real filesystem path) — read/delete both
 * operate on that id directly.
 */
export class GoogleDriveStorageProvider implements FileStorageProvider {
  private async getAccessToken(): Promise<string> {
    const credentials = await getGoogleCredentials();
    if (!credentials) throw new Error("Google isn't connected yet — connect it under Settings → Integrations");
    return getGoogleAccessToken(credentials);
  }

  async save(input: { filename: string; mimeType: string; buffer: Buffer }): Promise<StoredFileHandle> {
    const accessToken = await this.getAccessToken();

    // Resumable upload: correct approach for anything beyond a few MB (Google recommends
    // simple/multipart only under ~5MB) — this app allows uploads up to 10MB.
    const startRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mimeType,
      },
      body: JSON.stringify({ name: input.filename }),
    });

    if (!startRes.ok) {
      throw new Error(`Google Drive upload session failed (${startRes.status}): ${await startRes.text()}`);
    }

    const uploadUrl = startRes.headers.get("location");
    if (!uploadUrl) throw new Error("Google Drive did not return an upload session URL");

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": input.mimeType, "Content-Length": String(input.buffer.length) },
      // Node's fetch accepts a Buffer at runtime; the DOM BodyInit type just doesn't list it.
      body: input.buffer as unknown as BodyInit,
    });

    if (!uploadRes.ok) {
      throw new Error(`Google Drive upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
    }

    const data = (await uploadRes.json()) as { id: string };
    return { storageProvider: "google_drive", storagePath: data.id };
  }

  async read(storagePath: string): Promise<Buffer> {
    const accessToken = await this.getAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${storagePath}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Google Drive download failed (${res.status}): ${await res.text()}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(storagePath: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${storagePath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Google Drive delete failed (${res.status}): ${await res.text()}`);
    }
  }
}
