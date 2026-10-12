import "server-only";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import type { FileStorageProvider, StoredFileHandle } from "@/lib/storage/provider";

// Real, working default — unlike the AI/WhatsApp console providers (which can't do anything
// real without a paid API key), local disk storage genuinely works out of the box. Files live
// outside `public/` (under a server-only directory) specifically so nothing is ever reachable
// by guessing a URL — every read goes through /api/files/[id], which re-checks the same access
// rule as the owning record before streaming bytes back.
const UPLOAD_ROOT = path.join(process.cwd(), ".uploads");

export class LocalFileStorageProvider implements FileStorageProvider {
  async save(input: { filename: string; mimeType: string; buffer: Buffer }): Promise<StoredFileHandle> {
    // A serverless host (Vercel) gives each request a throwaway disk, so a file saved here would
    // be accepted and then vanish. Failing loudly is better than losing receipts and homework.
    if (process.env.VERCEL) {
      throw new Error("Local file storage can't be used on this host. Choose Google Drive under Settings → Integrations.");
    }
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `${randomUUID()}-${safeName}`;
    await fs.writeFile(path.join(UPLOAD_ROOT, storedName), input.buffer);
    return { storageProvider: "local", storagePath: storedName };
  }

  async read(storagePath: string): Promise<Buffer> {
    return fs.readFile(path.join(UPLOAD_ROOT, storagePath));
  }

  async delete(storagePath: string): Promise<void> {
    await fs.rm(path.join(UPLOAD_ROOT, storagePath), { force: true });
  }
}
