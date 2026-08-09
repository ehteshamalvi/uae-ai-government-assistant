import { calculateNextAction } from './next-action.service';
import {
  deriveFieldStatus,
  generateTransactionReference,
} from './transaction.helpers';

describe('calculateNextAction', () => {
  it('asks to upload when documents missing', () => {
    const action = calculateNextAction({
      readinessScore: 40,
      readinessStatus: 'IN_PROGRESS',
      missingDocuments: 2,
      warningDocuments: 0,
      invalidDocuments: 0,
      unanalyzedDocuments: 0,
      missingFields: 0,
      hasPreparedStep: false,
      blocked: false,
    });
    expect(action.code).toBe('UPLOAD_DOCUMENT');
  });

  it('asks to review warning documents', () => {
    const action = calculateNextAction({
      readinessScore: 88,
      readinessStatus: 'ALMOST_READY',
      missingDocuments: 0,
      warningDocuments: 1,
      invalidDocuments: 0,
      unanalyzedDocuments: 0,
      missingFields: 0,
      hasPreparedStep: true,
      blocked: false,
    });
    expect(action.code).toBe('REVIEW_DOCUMENT');
  });

  it('asks to complete information when fields missing', () => {
    const action = calculateNextAction({
      readinessScore: 70,
      readinessStatus: 'IN_PROGRESS',
      missingDocuments: 0,
      warningDocuments: 0,
      invalidDocuments: 0,
      unanalyzedDocuments: 0,
      missingFields: 2,
      hasPreparedStep: false,
      blocked: false,
    });
    expect(action.code).toBe('COMPLETE_INFORMATION');
  });

  it('asks to review application when ready', () => {
    const action = calculateNextAction({
      readinessScore: 98,
      readinessStatus: 'READY',
      missingDocuments: 0,
      warningDocuments: 0,
      invalidDocuments: 0,
      unanalyzedDocuments: 0,
      missingFields: 0,
      hasPreparedStep: true,
      blocked: false,
    });
    expect(action.code).toBe('REVIEW_APPLICATION');
  });
});

describe('transaction helpers', () => {
  it('does not reuse demo reference', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateTransactionReference()).not.toBe('TRX-9824-A71');
    }
  });

  it('derives field statuses', () => {
    expect(
      deriveFieldStatus({
        value: null,
        source: 'USER_PROVIDED',
        isVerified: false,
        confidence: null,
      }),
    ).toBe('MISSING');
    expect(
      deriveFieldStatus({
        value: 'Tech LLC',
        source: 'SYSTEM_VERIFIED',
        isVerified: true,
        confidence: 1,
      }),
    ).toBe('VALID');
    expect(
      deriveFieldStatus({
        value: 'CN-1',
        source: 'AI_EXTRACTED',
        isVerified: false,
        confidence: 0.5,
      }),
    ).toBe('WARNING');
  });
});
