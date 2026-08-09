import { ReadinessService } from './readiness.service';

describe('Readiness integration with document validation', () => {
  const readiness = new ReadinessService();

  const requirements = [
    {
      id: '1',
      code: 'COMPANY_NAME',
      type: 'FIELD' as const,
      labelEn: 'Company Name',
      labelAr: 'اسم',
      isMandatory: true,
      documentType: null,
      sortOrder: 1,
    },
    {
      id: '2',
      code: 'DOC_TRADE_LICENSE',
      type: 'DOCUMENT' as const,
      labelEn: 'Trade License',
      labelAr: 'رخصة',
      isMandatory: true,
      documentType: 'TRADE_LICENSE',
      sortOrder: 2,
    },
    {
      id: '3',
      code: 'DOC_EMIRATES_ID',
      type: 'DOCUMENT' as const,
      labelEn: 'Emirates ID',
      labelAr: 'هوية',
      isMandatory: true,
      documentType: 'EMIRATES_ID',
      sortOrder: 3,
    },
  ];

  it('scores lower when a document has WARNING status', () => {
    const before = readiness.calculate({
      requirements,
      fields: [{ code: 'COMPANY_NAME', value: 'Tech Innovations LLC' }],
      documents: [
        {
          id: 'd1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'tl.pdf',
        },
        {
          id: 'd2',
          documentType: 'EMIRATES_ID',
          status: 'WARNING',
          fileName: 'eid.jpg',
        },
      ],
    });

    const after = readiness.calculate({
      requirements,
      fields: [{ code: 'COMPANY_NAME', value: 'Tech Innovations LLC' }],
      documents: [
        {
          id: 'd1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'tl.pdf',
        },
        {
          id: 'd2',
          documentType: 'EMIRATES_ID',
          status: 'VALID',
          fileName: 'eid.jpg',
        },
      ],
    });

    expect(before.breakdown.documents.completed).toBe(2);
    expect(before.breakdown.validation.score).toBeLessThan(
      after.breakdown.validation.score,
    );
    expect(after.score).toBeGreaterThan(before.score);
  });

  it('treats missing document as incomplete', () => {
    const result = readiness.calculate({
      requirements,
      fields: [{ code: 'COMPANY_NAME', value: 'Tech Innovations LLC' }],
      documents: [
        {
          id: 'd1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'tl.pdf',
        },
      ],
    });
    expect(result.breakdown.documents.completed).toBe(1);
    expect(
      result.missingRequirements.some((m) => m.code === 'DOC_EMIRATES_ID'),
    ).toBe(true);
  });
});
