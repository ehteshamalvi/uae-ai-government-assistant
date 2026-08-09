import { evaluateRequirements } from './requirement-evaluator';

describe('evaluateRequirements', () => {
  it('marks completed fields and documents', () => {
    const result = evaluateRequirements(
      [
        {
          id: '1',
          code: 'COMPANY_NAME',
          type: 'FIELD',
          labelEn: 'Company',
          labelAr: 'شركة',
          isMandatory: true,
          sortOrder: 1,
        },
        {
          id: '2',
          code: 'DOC_LICENSE',
          type: 'DOCUMENT',
          labelEn: 'License',
          labelAr: 'رخصة',
          isMandatory: true,
          documentType: 'TRADE_LICENSE',
          sortOrder: 2,
        },
      ],
      [{ code: 'COMPANY_NAME', value: 'Acme' }],
      [
        {
          id: 'd1',
          documentType: 'TRADE_LICENSE',
          status: 'VALID',
          fileName: 'license.pdf',
        },
      ],
    );

    expect(result.every((r) => r.status === 'COMPLETE')).toBe(true);
  });

  it('marks missing mandatory documents as MISSING', () => {
    const result = evaluateRequirements(
      [
        {
          id: '2',
          code: 'DOC_LICENSE',
          type: 'DOCUMENT',
          labelEn: 'License',
          labelAr: 'رخصة',
          isMandatory: true,
          documentType: 'TRADE_LICENSE',
          sortOrder: 2,
        },
      ],
      [],
      [],
    );
    expect(result[0]?.status).toBe('MISSING');
  });

  it('marks WARNING and BLOCKED document statuses', () => {
    const warning = evaluateRequirements(
      [
        {
          id: '2',
          code: 'DOC_EID',
          type: 'DOCUMENT',
          labelEn: 'EID',
          labelAr: 'EID',
          isMandatory: true,
          documentType: 'EMIRATES_ID',
          sortOrder: 1,
        },
      ],
      [],
      [
        {
          id: 'd1',
          documentType: 'EMIRATES_ID',
          status: 'WARNING',
          fileName: 'eid.jpg',
        },
      ],
    );
    expect(warning[0]?.status).toBe('WARNING');

    const blocked = evaluateRequirements(
      [
        {
          id: '2',
          code: 'DOC_EID',
          type: 'DOCUMENT',
          labelEn: 'EID',
          labelAr: 'EID',
          isMandatory: true,
          documentType: 'EMIRATES_ID',
          sortOrder: 1,
        },
      ],
      [],
      [
        {
          id: 'd1',
          documentType: 'EMIRATES_ID',
          status: 'EXPIRED',
          fileName: 'eid.jpg',
        },
      ],
    );
    expect(blocked[0]?.status).toBe('BLOCKED');
  });
});
