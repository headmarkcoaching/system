export interface StoredFileHandle {
  storageProvider: string;
  storagePath: string;
}

export interface FileStorageProvider {
  /** Persists the given bytes and returns where it was stored. Never overwrites — each call
   * should produce a distinct storagePath even for the same filename. */
  save(input: { filename: string; mimeType: string; buffer: Buffer }): Promise<StoredFileHandle>;
  /** Reads the bytes back for a previously-saved file. */
  read(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
}
