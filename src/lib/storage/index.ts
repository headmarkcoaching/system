import "server-only";
import type { FileStorageProvider } from "@/lib/storage/provider";
import { LocalFileStorageProvider } from "@/lib/storage/providers/local-provider";
import { GoogleDriveStorageProvider } from "@/lib/storage/providers/google-drive-provider";
import * as integrationSettingsService from "@/lib/services/integration-settings";

/** The provider new uploads are saved through — IntegrationSettings (Settings → Integrations,
 * set by the Super Admin) takes priority over FILE_STORAGE_PROVIDER/env, falling back to env
 * only when the DB row still says LOCAL and an env var overrides it. */
export async function getFileStorageProvider(): Promise<FileStorageProvider> {
  const settings = await integrationSettingsService.getIntegrationSettingsInternal();
  const provider = settings.fileStorageProvider !== "LOCAL" ? settings.fileStorageProvider : process.env.FILE_STORAGE_PROVIDER?.toUpperCase();

  switch (provider) {
    case "GOOGLE_DRIVE":
      return new GoogleDriveStorageProvider();
    default:
      return new LocalFileStorageProvider();
  }
}

/** Reading/deleting an existing file must use the provider it was actually saved through
 * (`UploadedFile.storageProvider`), not whatever's currently active — otherwise switching the
 * active provider would silently break every file uploaded under the previous one. */
export function getFileStorageProviderByName(name: string): FileStorageProvider {
  switch (name) {
    case "google_drive":
      return new GoogleDriveStorageProvider();
    case "local":
    default:
      return new LocalFileStorageProvider();
  }
}
