import { ReadinessService } from './readiness.service';
import type { RequirementDefinition } from './requirement-evaluator';

const readiness = new ReadinessService();

function field(
  code: string,
  label: string,
  mandatory = true,
): RequirementDefinition {
  return {
    id: code,
    code,
    type: 'FIELD',
    labelEn: label,
    labelAr: label,
    isMandatory: mandatory,
    sortOrder: 1,
  };
}

function doc(
  code: string,
  documentType: string,
  label: string,
  mandatory = true,
): RequirementDefinition {
  return {
    id: code,
    code,
    type: 'DOCUMENT',
    labelEn: label,
    labelAr: label,
    isMandatory: mandatory,
    documentType,
    sortOrder: 10,
  };
}

describe('ReadinessService', () => {
  const baseReqs: RequirementDefinition[] = [
    field('COMPANY_NAME', 'Company Name'),
    field('LICENSE_NUMBER', 'License Number'),
    doc('DOC_TRADE_LICENSE', 'TRADE_LICENSE', 'Trade License'),
    doc('DOC_TENANCY', 'TENANCY_CONTRACT', 'Tenancy'),
    doc('DOC_NOC', 'NOC', 'NOC', false),
  ];

  it('scores 100 when all mandatory items are complete', () => {
    const result = readiness.calculate({
      requirements: baseReqs,
      fields: [
        { code: 'COMPANY_NAME', value: 'Acme' },
        { code: 'LICENSE_NUMBER', value: '1' },
      ],
      documents: [
        {
          id: '1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'a.pdf',
        },
        {
          id: '2',
          documentType: 'TENANCY_CONTRACT',
          status: 'VALID',
          fileName: 'b.pdf',
        },
      ],
    });

    expect(result.score).toBe(100);
    expect(result.status).toBe('READY');
    expect(result.breakdown.documents.completed).toBe(2);
    expect(result.breakdown.documents.required).toBe(2);
    expect(result.breakdown.information.completed).toBe(2);
  });

  it('reduces score when one mandatory document is missing', () => {
    const result = readiness.calculate({
      requirements: baseReqs,
      fields: [
        { code: 'COMPANY_NAME', value: 'Acme' },
        { code: 'LICENSE_NUMBER', value: '1' },
      ],
      documents: [
        {
          id: '1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'a.pdf',
        },
      ],
    });

    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThan(0);
    expect(result.breakdown.documents.completed).toBe(1);
    expect(result.breakdown.documents.required).toBe(2);
    expect(
      result.missingRequirements.some((m) => m.code === 'DOC_TENANCY'),
    ).toBe(true);
    expect(result.status).not.toBe('READY');
  });

  it('reduces score further when multiple documents are missing', () => {
    const oneMissing = readiness.calculate({
      requirements: baseReqs,
      fields: [
        { code: 'COMPANY_NAME', value: 'Acme' },
        { code: 'LICENSE_NUMBER', value: '1' },
      ],
      documents: [
        {
          id: '1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'a.pdf',
        },
      ],
    });
    const allMissing = readiness.calculate({
      requirements: baseReqs,
      fields: [
        { code: 'COMPANY_NAME', value: 'Acme' },
        { code: 'LICENSE_NUMBER', value: '1' },
      ],
      documents: [],
    });

    expect(allMissing.score).toBeLessThan(oneMissing.score);
    expect(allMissing.breakdown.documents.completed).toBe(0);
  });

  it('penalizes incomplete fields', () => {
    const result = readiness.calculate({
      requirements: baseReqs,
      fields: [{ code: 'COMPANY_NAME', value: 'Acme' }],
      documents: [
        {
          id: '1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'a.pdf',
        },
        {
          id: '2',
          documentType: 'TENANCY_CONTRACT',
          status: 'VALID',
          fileName: 'b.pdf',
        },
      ],
    });

    expect(result.breakdown.information.completed).toBe(1);
    expect(result.breakdown.information.required).toBe(2);
    expect(result.score).toBeLessThan(100);
  });

  it('treats document WARNING as present but lowers validation score', () => {
    const result = readiness.calculate({
      requirements: baseReqs,
      fields: [
        { code: 'COMPANY_NAME', value: 'Acme' },
        { code: 'LICENSE_NUMBER', value: '1' },
      ],
      documents: [
        {
          id: '1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'a.pdf',
        },
        {
          id: '2',
          documentType: 'TENANCY_CONTRACT',
          status: 'WARNING',
          fileName: 'b.pdf',
        },
      ],
    });

    expect(result.breakdown.documents.completed).toBe(2);
    expect(result.breakdown.validation.score).toBeLessThan(100);
    expect(result.issues.some((i) => i.severity === 'warning')).toBe(true);
    expect(result.status).toBe('ALMOST_READY');
  });

  it('returns BLOCKED when a mandatory document is INVALID', () => {
    const result = readiness.calculate({
      requirements: baseReqs,
      fields: [
        { code: 'COMPANY_NAME', value: 'Acme' },
        { code: 'LICENSE_NUMBER', value: '1' },
      ],
      documents: [
        {
          id: '1',
          documentType: 'TRADE_LICENSE',
          status: 'INVALID',
          fileName: 'a.pdf',
        },
        {
          id: '2',
          documentType: 'TENANCY_CONTRACT',
          status: 'VALID',
          fileName: 'b.pdf',
        },
      ],
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('clamps score between 0 and 100', () => {
    const empty = readiness.calculate({
      requirements: baseReqs,
      fields: [],
      documents: [],
    });
    expect(empty.score).toBeGreaterThanOrEqual(0);
    expect(empty.score).toBeLessThanOrEqual(100);
  });

  it('does not hard-code 82 — different inputs produce different scores', () => {
    const a = readiness.calculate({
      requirements: baseReqs,
      fields: [
        { code: 'COMPANY_NAME', value: 'Acme' },
        { code: 'LICENSE_NUMBER', value: '1' },
      ],
      documents: [
        {
          id: '1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'a.pdf',
        },
        {
          id: '2',
          documentType: 'TENANCY_CONTRACT',
          status: 'VALID',
          fileName: 'b.pdf',
        },
      ],
    });
    const b = readiness.calculate({
      requirements: baseReqs,
      fields: [],
      documents: [],
    });
    expect(a.score).not.toBe(b.score);
    expect([a.score, b.score]).not.toEqual([82, 82]);
  });

  it('maps low scores to NOT_STARTED / IN_PROGRESS', () => {
    const result = readiness.calculate({
      requirements: [
        field('A', 'A'),
        field('B', 'B'),
        field('C', 'C'),
        doc('D1', 'T1', 'D1'),
        doc('D2', 'T2', 'D2'),
        doc('D3', 'T3', 'D3'),
      ],
      fields: [],
      documents: [],
    });
    expect(['NOT_STARTED', 'IN_PROGRESS']).toContain(result.status);
  });
});
