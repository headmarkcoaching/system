import "server-only";
import type { FileStorageProvider, StoredFileHandle } from "@/lib/storage/provider";
import { getGoogleCredentials, getGoogleAccessToken } from "@/lib/google/oauth";

const FOLDER_NAME = "Head Mark Coaching Uploads";
const FOLDER_MIME = "application/vnd.google-apps.folder";

// Drive ids are letters, digits, "-" and "_". storagePath comes from our own database, but it goes
// straight into a request path, so anything else is refused rather than trusted.
const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;

let cachedFolderId: string | null = null;

/** Retries once on a rate limit or a Google-side error, which are usually gone a moment later. */
async function driveFetch(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 429 || res.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return fetch(url, init);
  }
  return res;
}

/**
 * Google Drive storage provider — plain fetch calls against Drive API v3 (no googleapis SDK,
 * same lightweight style as every other provider in this app). Uses the `drive.file` scope
 * (the same Google connection that powers Google Meet — see src/lib/google/oauth.ts), which
 * only grants access to files this app itself creates, not the connected account's whole Drive.
 *
 * Files go into one dedicated folder and are private to the connected account: nothing is shared
 * by link, and every read still passes through /api/files/[id], which checks who is asking.
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

  /** Finds the uploads folder (created by this app, so visible under drive.file) or makes it. */
  private async getFolderId(accessToken: string): Promise<string> {
    if (cachedFolderId) return cachedFolderId;

    const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`);
    const found = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&pageSize=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (found.ok) {
      const data = (await found.json()) as { files?: { id: string }[] };
      if (data.files?.[0]?.id) {
        cachedFolderId = data.files[0].id;
        return cachedFolderId;
      }
    }

    const created = await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
    });
    if (!created.ok) throw new Error(`Google Drive couldn't create the uploads folder (${created.status}): ${await created.text()}`);
    cachedFolderId = ((await created.json()) as { id: string }).id;
    return cachedFolderId;
  }

  async save(input: { filename: string; mimeType: string; buffer: Buffer }): Promise<StoredFileHandle> {
    const accessToken = await this.getAccessToken();
    const folderId = await this.getFolderId(accessToken);

    // Resumable upload: correct approach for anything beyond a few MB (Google recommends
    // simple/multipart only under ~5MB) — this app allows uploads up to 10MB.
    const startRes = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mimeType,
      },
      body: JSON.stringify({ name: input.filename, parents: [folderId] }),
    });

    if (!startRes.ok) {
      // A cached folder id goes stale if someone deletes the folder in Drive; look it up again next time.
      if (startRes.status === 404) cachedFolderId = null;
      throw new Error(`Google Drive upload session failed (${startRes.status}): ${await startRes.text()}`);
    }

    const uploadUrl = startRes.headers.get("location");
    if (!uploadUrl) throw new Error("Google Drive did not return an upload session URL");

    const uploadRes = await driveFetch(uploadUrl, {
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
    if (!DRIVE_ID.test(storagePath)) throw new Error("Invalid Google Drive file id");
    const accessToken = await this.getAccessToken();
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${storagePath}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Google Drive download failed (${res.status}): ${await res.text()}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(storagePath: string): Promise<void> {
    if (!DRIVE_ID.test(storagePath)) throw new Error("Invalid Google Drive file id");
    const accessToken = await this.getAccessToken();
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${storagePath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Google Drive delete failed (${res.status}): ${await res.text()}`);
    }
  }
}
