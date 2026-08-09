/**
 * Local filesystem document storage for Phase 2 demos.
 * Swap implementations later for S3 / Azure / GCS without rewriting callers.
 */
export interface StoredObjectMeta {
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
}

export interface DocumentStorageProvider {
  save(input: {
    transactionId: string;
    originalName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<StoredObjectMeta>;

  getAbsolutePath(storageKey: string): string;

  delete(storageKey: string): Promise<void>;
}

export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');
