import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { LocalDocumentStorageProvider } from './storage/local-document-storage.provider';
import { DOCUMENT_STORAGE } from './storage/document-storage.provider';
import { AiProvidersModule } from '../../providers/ai/ai-providers.module';

@Module({
  imports: [AiProvidersModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    LocalDocumentStorageProvider,
    { provide: DOCUMENT_STORAGE, useExisting: LocalDocumentStorageProvider },
  ],
  exports: [
    DocumentsService,
    LocalDocumentStorageProvider,
    DOCUMENT_STORAGE,
    AiProvidersModule,
  ],
})
export class DocumentsModule {}
