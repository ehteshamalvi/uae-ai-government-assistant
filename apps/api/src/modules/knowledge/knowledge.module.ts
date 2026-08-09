import { Module } from '@nestjs/common';
import { LocalKnowledgeRetriever } from './local-knowledge.retriever';
import { KNOWLEDGE_RETRIEVER } from './knowledge.types';

@Module({
  providers: [
    LocalKnowledgeRetriever,
    { provide: KNOWLEDGE_RETRIEVER, useExisting: LocalKnowledgeRetriever },
  ],
  exports: [KNOWLEDGE_RETRIEVER, LocalKnowledgeRetriever],
})
export class KnowledgeModule {}
