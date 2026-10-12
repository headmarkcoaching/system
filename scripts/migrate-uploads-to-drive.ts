// One-time move of existing uploads from local disk (.uploads) to Google Drive, then switches
// the app to save new uploads to Drive as well.
//
// Run:  npx tsx --conditions=react-server scripts/migrate-uploads-to-drive.ts
//
// Safe to repeat: it only touches files still marked "local", and it stops before changing
// anything if Google Drive isn't reachable. A local copy is deleted only after the same bytes
// have been read back from Drive and matched.

try {
  process.loadEnvFile();
} catch {
  // No .env file — environment variables may be set another way.
}

import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { GoogleDriveStorageProvider } from "../src/lib/storage/providers/google-drive-provider";

const db = new PrismaClient();
const UPLOAD_ROOT = path.join(process.cwd(), ".uploads");

async function main() {
  const drive = new GoogleDriveStorageProvider();

  // Prove Drive works before changing anything.
  const probe = Buffer.from(`%PDF-1.4 migration probe ${Date.now()}`);
  const probeHandle = await drive.save({ filename: "migration-probe.pdf", mimeType: "application/pdf", buffer: probe });
  const probeBack = await drive.read(probeHandle.storagePath);
  await drive.delete(probeHandle.storagePath);
  if (!probeBack.equals(probe)) throw new Error("Google Drive returned different bytes than were uploaded. Nothing was changed.");
  console.log("Google Drive is working.");

  const files = await db.uploadedFile.findMany({ where: { storageProvider: "local" } });
  console.log(`${files.length} file(s) to move.`);

  let moved = 0;
  let missing = 0;
  for (const file of files) {
    const localPath = path.join(UPLOAD_ROOT, file.storagePath);
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(localPath);
    } catch {
      console.warn(`  skipped ${file.filename}: not found on this computer's disk (${file.id}).`);
      missing++;
      continue;
    }

    const handle = await drive.save({ filename: file.filename, mimeType: file.mimeType, buffer: bytes });
    const check = await drive.read(handle.storagePath);
    if (!check.equals(bytes)) {
      await drive.delete(handle.storagePath);
      throw new Error(`Copy of ${file.filename} did not match the original. Stopped; nothing else was changed.`);
    }

    await db.uploadedFile.update({ where: { id: file.id }, data: { storageProvider: handle.storageProvider, storagePath: handle.storagePath } });
    await fs.rm(localPath, { force: true });
    moved++;
    console.log(`  moved ${file.filename}`);
  }

  const settings = await db.integrationSettings.findFirst();
  if (settings) {
    await db.integrationSettings.update({ where: { id: settings.id }, data: { fileStorageProvider: "GOOGLE_DRIVE" } });
    console.log("New uploads will now be saved to Google Drive.");
  } else {
    console.warn("No integration settings row found; set the file storage provider to Google Drive under Settings → Integrations.");
  }

  console.log(`Done. Moved ${moved}, skipped ${missing}.`);
}

main()
  .catch((err) => {
    console.error("Failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
