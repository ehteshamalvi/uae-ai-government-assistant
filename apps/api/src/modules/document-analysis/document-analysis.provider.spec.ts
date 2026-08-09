import { MockDocumentAnalysisProvider } from '../../providers/ai/mock-ai.providers';

describe('MockDocumentAnalysisProvider', () => {
  const provider = new MockDocumentAnalysisProvider();

  it('classifies Emirates ID with warning on image', async () => {
    const result = await provider.analyze({
      fileName: 'emirates-id.jpg',
      mimeType: 'image/jpeg',
    });
    expect(result.documentType).toBe('EMIRATES_ID');
    expect(result.checks.imageQuality).toBe('WARN');
    expect(result.issues.some((i) => i.severity === 'warning')).toBe(true);
  });

  it('classifies trade license PDF as valid-ish', async () => {
    const result = await provider.analyze({
      fileName: 'trade-license.pdf',
      mimeType: 'application/pdf',
    });
    expect(result.documentType).toBe('TRADE_LICENSE');
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('returns UNKNOWN for unclassified files', async () => {
    const result = await provider.analyze({
      fileName: 'random.bin',
      mimeType: 'application/octet-stream',
    });
    expect(result.documentType).toBe('UNKNOWN');
  });

  it('supports passport, tenancy, MOA, trade name', async () => {
    const types = await Promise.all([
      provider.analyze({
        fileName: 'passport.pdf',
        mimeType: 'application/pdf',
      }),
      provider.analyze({
        fileName: 'tenancy-contract.pdf',
        mimeType: 'application/pdf',
      }),
      provider.analyze({ fileName: 'moa.pdf', mimeType: 'application/pdf' }),
      provider.analyze({
        fileName: 'trade_name_certificate.pdf',
        mimeType: 'application/pdf',
      }),
    ]);
    expect(types.map((t) => t.documentType)).toEqual([
      'PASSPORT',
      'TENANCY_CONTRACT',
      'MEMORANDUM_OF_ASSOCIATION',
      'TRADE_NAME_CERTIFICATE',
    ]);
  });
});
