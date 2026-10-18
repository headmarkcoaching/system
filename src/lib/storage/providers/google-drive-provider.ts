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

  /**
   * Starts a resumable upload that the teacher's BROWSER then performs directly against Google,
   * so a large lecture video never passes through (or is limited by) the web server. The session
   * is created with the site's Origin so Google allows the browser's cross-origin uploads for it.
   * Returns the one-time session address the browser uploads to.
   */
  async startResumableUpload(input: { filename: string; mimeType: string; size: number; origin: string }): Promise<string> {
    const accessToken = await this.getAccessToken();
    const folderId = await this.getFolderId(accessToken);
    const res = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mimeType,
        "X-Upload-Content-Length": String(input.size),
        Origin: input.origin,
      },
      body: JSON.stringify({ name: input.filename, parents: [folderId] }),
    });
    if (!res.ok) {
      if (res.status === 404) cachedFolderId = null;
      throw new Error(`Google Drive upload session failed (${res.status}): ${await res.text()}`);
    }
    const location = res.headers.get("location");
    if (!location) throw new Error("Google Drive did not return an upload session URL");
    return location;
  }

  /**
   * Uploads a large file from a stream (for example a lecture recording coming from Zoom) without ever
   * holding all of it in memory. It is sent in 16 MB pieces over one resumable session; if a piece
   * fails in transit, Drive is asked how much it received and the piece is continued from there.
   * The size must be known up front. Returns the new file's id.
   */
  async uploadStream(input: { filename: string; mimeType: string; size: number; stream: ReadableStream<Uint8Array> }): Promise<string> {
    if (!(input.size > 0)) throw new Error("A stream upload needs the file size up front");
    const accessToken = await this.getAccessToken();
    const folderId = await this.getFolderId(accessToken);

    const start = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mimeType,
        "X-Upload-Content-Length": String(input.size),
      },
      body: JSON.stringify({ name: input.filename, parents: [folderId] }),
    });
    if (!start.ok) {
      if (start.status === 404) cachedFolderId = null;
      throw new Error(`Google Drive upload session failed (${start.status}): ${await start.text()}`);
    }
    const sessionUrl = start.headers.get("location");
    if (!sessionUrl) throw new Error("Google Drive did not return an upload session URL");

    // Pieces must be a multiple of 256 KB (except the last one).
    const PIECE = 64 * 262144;
    const total = input.size;
    let offset = 0;
    let pending: Uint8Array[] = [];
    let pendingBytes = 0;
    let fileId: string | null = null;

    const sendPiece = async (piece: Buffer) => {
      let sent = 0;
      for (let attempt = 1; attempt <= 4; attempt++) {
        const body = piece.subarray(sent);
        const from = offset + sent;
        try {
          const res = await fetch(sessionUrl, {
            method: "PUT",
            headers: { "Content-Length": String(body.length), "Content-Range": `bytes ${from}-${from + body.length - 1}/${total}` },
            body: body as unknown as BodyInit,
          });
          if (res.status === 308) {
            return;
          }
          if (res.ok) {
            fileId = ((await res.json()) as { id: string }).id;
            return;
          }
          if (res.status < 500 && res.status !== 429) throw new Error(`Google Drive upload failed (${res.status}): ${await res.text()}`);
        } catch (err) {
          if (attempt === 4) throw err;
        }
        // Ask Drive how far it got, then carry on from there.
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        const probe = await fetch(sessionUrl, { method: "PUT", headers: { "Content-Length": "0", "Content-Range": `bytes */${total}` } });
        if (probe.ok) {
          fileId = ((await probe.json()) as { id: string }).id;
          return;
        }
        const range = probe.headers.get("range");
        const received = range ? Number(range.split("-")[1]) + 1 : 0;
        sent = Math.max(0, Math.min(piece.length, received - offset));
      }
      throw new Error("Google Drive upload kept failing");
    };

    const flush = async (final: boolean) => {
      while (pendingBytes >= PIECE || (final && pendingBytes > 0)) {
        const joined = Buffer.concat(pending, pendingBytes);
        const take = pendingBytes >= PIECE ? PIECE : pendingBytes;
        await sendPiece(joined.subarray(0, take));
        offset += take;
        const rest = joined.subarray(take);
        pending = rest.length ? [rest] : [];
        pendingBytes = rest.length;
      }
    };

    const reader = input.stream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (offset + pendingBytes + value.length > total) throw new Error("The file is larger than the size it was announced with");
        pending.push(value);
        pendingBytes += value.length;
        if (pendingBytes >= PIECE) await flush(false);
      }
      await flush(true);
    } finally {
      reader.releaseLock();
    }

    if (offset !== total) throw new Error(`The file ended early (${offset} of ${total} bytes)`);
    if (!fileId) throw new Error("Google Drive did not confirm the upload");
    return fileId;
  }

  /** Name, type and size of a file this app created, or null if Drive does not know it. */
  async getFileInfo(fileId: string): Promise<{ id: string; name: string; mimeType: string; size: number } | null> {
    if (!DRIVE_ID.test(fileId)) return null;
    const accessToken = await this.getAccessToken();
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,trashed`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Google Drive lookup failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { id: string; name: string; mimeType: string; size?: string; trashed?: boolean };
    if (data.trashed) return null;
    return { id: data.id, name: data.name, mimeType: data.mimeType, size: Number(data.size ?? 0) };
  }

  /** Opens a file for streaming, passing a browser's Range header through so video can seek. */
  async openStream(fileId: string, range?: string | null): Promise<Response> {
    if (!DRIVE_ID.test(fileId)) throw new Error("Invalid Google Drive file id");
    const accessToken = await this.getAccessToken();
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    if (range) headers.Range = range;
    return driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers });
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
