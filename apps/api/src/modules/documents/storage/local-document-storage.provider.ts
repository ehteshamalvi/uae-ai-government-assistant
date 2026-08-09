import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  DocumentStorageProvider,
  StoredObjectMeta,
} from './document-storage.provider';

@Injectable()
export class LocalDocumentStorageProvider implements DocumentStorageProvider {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root =
      config.get<string>('documentStoragePath') ??
      path.join(process.cwd(), 'storage', 'documents');
  }

  async save(input: {
    transactionId: string;
    originalName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<StoredObjectMeta> {
    const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = path.posix.join(
      input.transactionId,
      `${randomUUID()}-${safeName}`,
    );
    const absolute = this.getAbsolutePath(storageKey);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, input.buffer);

    return {
      storageKey,
      sizeBytes: input.buffer.byteLength,
      mimeType: input.mimeType,
    };
  }

  getAbsolutePath(storageKey: string): string {
    const normalized = path
      .normalize(storageKey)
      .replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.root, normalized);
  }

  async delete(storageKey: string): Promise<void> {
    const absolute = this.getAbsolutePath(storageKey);
    await unlink(absolute).catch(() => undefined);
  }

  checksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
