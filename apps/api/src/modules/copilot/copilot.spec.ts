import {
  classifyCopilotQuery,
  needsKnowledgeRetrieval,
} from './copilot-query.classifier';
import { MockCopilotAIProvider } from './mock-copilot-ai.provider';
import { validateCopilotResult } from './copilot-ai.types';
import { LocalKnowledgeRetriever } from '../knowledge/local-knowledge.retriever';
import type { KnowledgeDocument } from '../knowledge/knowledge.types';

describe('classifyCopilotQuery', () => {
  it('classifies readiness, missing, document, payment, guardrail', () => {
    expect(classifyCopilotQuery('Why is my readiness 88%?')).toBe(
      'READINESS_QUERY',
    );
    expect(classifyCopilotQuery('What is missing?')).toBe(
      'MISSING_REQUIREMENTS_QUERY',
    );
    expect(classifyCopilotQuery('Is my Emirates ID okay?')).toBe(
      'DOCUMENT_QUERY',
    );
    expect(classifyCopilotQuery('Show my payment summary')).toBe(
      'PAYMENT_QUERY',
    );
    expect(
      classifyCopilotQuery('Did you submit this to Dubai Government?'),
    ).toBe('GUARDRAIL_QUERY');
  });

  it('flags knowledge retrieval needs', () => {
    expect(needsKnowledgeRetrieval('KNOWLEDGE_QUERY')).toBe(true);
    expect(needsKnowledgeRetrieval('READINESS_QUERY')).toBe(false);
  });
});

describe('LocalKnowledgeRetriever', () => {
  const retriever = new LocalKnowledgeRetriever();
  const docs: KnowledgeDocument[] = [
    {
      id: 't1',
      title: 'Trade License Renewal — Documents',
      category: 'DOCUMENT',
      serviceCode: 'TRADE_LICENSE_RENEWAL',
      content: 'Demo trade license documents tenancy MOA Emirates ID',
      sourceType: 'GOVFLOW_DEMO_KNOWLEDGE',
      version: '1.0',
    },
    {
      id: 'e1',
      title: 'Emirates ID Update — Overview',
      category: 'SERVICE',
      serviceCode: 'EMIRATES_ID_UPDATE',
      content: 'Demo Emirates ID update service overview',
      sourceType: 'GOVFLOW_DEMO_KNOWLEDGE',
      version: '1.0',
    },
    {
      id: 'life',
      title: 'Transaction Lifecycle',
      category: 'LIFECYCLE',
      serviceCode: null,
      content: 'After submission PROCESSING COMPLETED sandbox',
      sourceType: 'GOVFLOW_DEMO_KNOWLEDGE',
      version: '1.0',
    },
  ];

  beforeAll(() => {
    retriever.setDocuments(docs);
  });

  it('prefers service-specific retrieval', async () => {
    const hits = await retriever.search('documents needed', {
      serviceCode: 'TRADE_LICENSE_RENEWAL',
      limit: 3,
    });
    expect(hits[0]?.metadata.serviceCode).toBe('TRADE_LICENSE_RENEWAL');
  });

  it('finds lifecycle knowledge', async () => {
    const hits = await retriever.search('after submission', {
      category: 'LIFECYCLE',
    });
    expect(hits.some((h) => h.title.includes('Lifecycle'))).toBe(true);
  });
});

describe('MockCopilotAIProvider', () => {
  const provider = new MockCopilotAIProvider();

  const baseCtx = {
    referenceCode: 'TRX-9824-A71',
    title: 'Trade License Renewal',
    status: 'PREPARING',
    service: { code: 'TRADE_LICENSE_RENEWAL', nameEn: 'Trade License Renewal' },
    readiness: {
      score: 88,
      status: 'ALMOST_READY',
      breakdown: {
        documents: { score: 100, completed: 4, required: 4 },
        information: { score: 100, completed: 5, required: 5 },
        validation: { score: 50 },
      },
      issues: [
        {
          severity: 'warning',
          message: 'Image quality is low',
          code: 'QUALITY',
        },
      ],
      missingRequirements: [],
    },
    fields: [
      {
        code: 'COMPANY_NAME',
        labelEn: 'Company Name',
        value: 'Tech LLC',
        source: 'SYSTEM_VERIFIED',
      },
    ],
    documents: [
      {
        id: 'd1',
        fileName: 'emirates-id.jpg',
        documentType: 'EMIRATES_ID',
        status: 'WARNING',
        analysisSummary: 'Image quality is low (demo AI check).',
      },
    ],
    payment: { statusLabel: 'PENDING', totalAmount: 2650, required: true },
    submissionReference: null,
    submittedAt: null,
    reviewConfirmedAt: null,
    nextAction: {
      code: 'REVIEW_DOCUMENT',
      label: 'Review document',
      reason: 'warning',
    },
    timelineSteps: [],
  };

  it('explains readiness from context', async () => {
    const result = await provider.generate({
      message: 'Why is my readiness 88%?',
      queryClass: 'READINESS_QUERY',
      transactionContext: baseCtx,
      knowledgeChunks: [],
      recentMessages: [],
    });
    expect(result.answer).toContain('88%');
    expect(result.sources.some((s) => s.type === 'Transaction Readiness')).toBe(
      true,
    );
    expect(result.suggestedActions.length).toBeGreaterThan(0);
  });

  it('returns guardrail for government submission claim', async () => {
    const result = await provider.generate({
      message: 'Did you submit to Dubai Government?',
      queryClass: 'GUARDRAIL_QUERY',
      transactionContext: baseCtx,
      knowledgeChunks: [],
      recentMessages: [],
    });
    expect(result.answer.toLowerCase()).toContain('sandbox');
    expect(result.answer.toLowerCase()).not.toContain(
      'successfully submitted to dubai',
    );
  });

  it('returns no-knowledge response when empty', async () => {
    const result = await provider.generate({
      message: 'obscure unrelated quantum tax law',
      queryClass: 'UNKNOWN',
      transactionContext: null,
      knowledgeChunks: [],
      recentMessages: [],
    });
    expect(result.noKnowledge).toBe(true);
    expect(result.confidenceBand).toBe('LOW');
  });

  it('explains payment and documents', async () => {
    const pay = await provider.generate({
      message: 'payment summary',
      queryClass: 'PAYMENT_QUERY',
      transactionContext: baseCtx,
      knowledgeChunks: [],
      recentMessages: [],
    });
    expect(pay.answer).toContain('2650');
    const doc = await provider.generate({
      message: 'Emirates ID',
      queryClass: 'DOCUMENT_QUERY',
      transactionContext: baseCtx,
      knowledgeChunks: [],
      recentMessages: [],
    });
    expect(doc.answer.toLowerCase()).toContain('warning');
  });

  it('validates provider output shape', () => {
    expect(() => validateCopilotResult({ answer: '' })).toThrow();
    const ok = validateCopilotResult({
      answer: 'Hello',
      confidence: 0.9,
      confidenceBand: 'HIGH',
      sources: [],
      suggestedActions: [],
    });
    expect(ok.answer).toBe('Hello');
  });
});
