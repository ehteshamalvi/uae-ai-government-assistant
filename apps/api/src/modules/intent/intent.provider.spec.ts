import { MockIntentProvider } from '../../providers/ai/mock-ai.providers';
import { classifyIntentConfidence } from '../../common/constants/ai.constants';

describe('MockIntentProvider', () => {
  const provider = new MockIntentProvider();

  it('identifies trade license renewal intent', async () => {
    const result = await provider.analyze('I want to renew my trade license');
    expect(result.intent).toBe('SERVICE_REQUEST');
    expect(result.serviceCandidateCode).toBe('TRADE_LICENSE_RENEWAL');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('identifies Emirates ID update intent', async () => {
    const result = await provider.analyze('I need to update my Emirates ID');
    expect(result.serviceCandidateCode).toBe('EMIRATES_ID_UPDATE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('identifies commercial permit intent', async () => {
    const result = await provider.analyze(
      'I want to apply for a commercial permit',
    );
    expect(result.serviceCandidateCode).toBe('COMMERCIAL_PERMIT');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('returns unknown for unrelated text', async () => {
    const result = await provider.analyze('What is the weather in Dubai?');
    expect(result.intent).toBe('UNKNOWN');
    expect(result.serviceCandidateCode).toBeNull();
  });

  it('scores low confidence for vague license mention', async () => {
    const result = await provider.analyze('license');
    expect(result.confidence).toBeLessThan(0.85);
  });
});

describe('classifyIntentConfidence', () => {
  it('maps thresholds', () => {
    expect(classifyIntentConfidence(0.96)).toBe('HIGH');
    expect(classifyIntentConfidence(0.7)).toBe('MEDIUM');
    expect(classifyIntentConfidence(0.4)).toBe('LOW');
  });
});
