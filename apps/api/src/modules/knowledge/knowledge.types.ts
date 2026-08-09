export type KnowledgeCategory =
  'SERVICE' | 'DOCUMENT' | 'LIFECYCLE' | 'PAYMENT' | 'SUBMISSION' | 'SANDBOX';

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  serviceCode: string | null;
  content: string;
  sourceType: string;
  version: string;
  updatedAt?: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  title: string;
  content: string;
  score: number;
  metadata: {
    category: KnowledgeCategory;
    serviceCode: string | null;
    sourceType: string;
  };
}

export interface KnowledgeSearchFilters {
  serviceCode?: string | null;
  category?: KnowledgeCategory;
  limit?: number;
}

export interface KnowledgeRetriever {
  search(
    query: string,
    filters?: KnowledgeSearchFilters,
  ): Promise<KnowledgeChunk[]>;
}

export const KNOWLEDGE_RETRIEVER = Symbol('KNOWLEDGE_RETRIEVER');
