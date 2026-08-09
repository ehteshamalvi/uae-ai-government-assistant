import { readFileSync } from 'fs';
import { join } from 'path';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type {
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeRetriever,
  KnowledgeSearchFilters,
} from './knowledge.types';

/**
 * Demo Knowledge Retrieval — deterministic keyword ranking.
 * Not semantic embedding retrieval. Swap later for pgvector/Pinecone.
 */
@Injectable()
export class LocalKnowledgeRetriever
  implements KnowledgeRetriever, OnModuleInit
{
  private documents: KnowledgeDocument[] = [];

  onModuleInit() {
    this.load();
  }

  private load() {
    const candidates = [
      join(process.cwd(), 'knowledge', 'demo-knowledge.json'),
      join(process.cwd(), 'apps', 'api', 'knowledge', 'demo-knowledge.json'),
      join(__dirname, '..', '..', '..', 'knowledge', 'demo-knowledge.json'),
    ];
    for (const path of candidates) {
      try {
        const raw = readFileSync(path, 'utf8');
        const parsed = JSON.parse(raw) as { documents: KnowledgeDocument[] };
        this.documents = parsed.documents ?? [];
        return;
      } catch {
        /* try next */
      }
    }
    this.documents = [];
  }

  /** Test helper */
  setDocuments(docs: KnowledgeDocument[]) {
    this.documents = docs;
  }

  search(
    query: string,
    filters?: KnowledgeSearchFilters,
  ): Promise<KnowledgeChunk[]> {
    const q = query.toLowerCase().trim();
    const terms = q.split(/\s+/).filter((t) => t.length > 2);
    const limit = filters?.limit ?? 4;

    const scored = this.documents
      .filter((d) => {
        if (filters?.category && d.category !== filters.category) return false;
        if (
          filters?.serviceCode &&
          d.serviceCode &&
          d.serviceCode !== filters.serviceCode
        ) {
          return false;
        }
        return true;
      })
      .map((d) => {
        const hay =
          `${d.title} ${d.content} ${d.category} ${d.serviceCode ?? ''}`.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (hay.includes(term)) score += 1;
        }
        // Boost service match only when the query already hits the document
        if (
          score > 0 &&
          filters?.serviceCode &&
          d.serviceCode === filters.serviceCode
        ) {
          score += 2;
        }
        if (!filters?.serviceCode && d.serviceCode == null && score > 0) {
          score += 0.5;
        }
        return { doc: d, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Prefer service-specific docs only when terms actually match content
    if (filters?.serviceCode && terms.length > 0) {
      const have = new Set(scored.map((s) => s.doc.id));
      for (const d of this.documents) {
        if (d.serviceCode === filters.serviceCode && !have.has(d.id)) {
          const hay = `${d.title} ${d.content}`.toLowerCase();
          const hit = terms.some((t) => hay.includes(t));
          if (hit) {
            scored.push({ doc: d, score: 1.5 });
            have.add(d.id);
          }
        }
        if (scored.length >= limit) break;
      }
      scored.sort((a, b) => b.score - a.score);
    }

    return Promise.resolve(
      scored.slice(0, limit).map((s) => ({
        id: `${s.doc.id}#chunk0`,
        documentId: s.doc.id,
        title: s.doc.title,
        content: s.doc.content,
        score: s.score,
        metadata: {
          category: s.doc.category,
          serviceCode: s.doc.serviceCode,
          sourceType: s.doc.sourceType,
        },
      })),
    );
  }
}
