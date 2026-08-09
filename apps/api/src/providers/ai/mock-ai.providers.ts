import { Injectable } from '@nestjs/common';
import type {
  AIProvider,
  DocumentAnalysisProvider,
  DocumentAnalysisResult,
  IntentProvider,
  IntentResult,
} from './ai.interfaces';

/**
 * Deterministic NL intent matcher — no OpenAI.
 * Maps phrases to known service codes from the catalog.
 */
@Injectable()
export class MockIntentProvider implements IntentProvider {
  analyze(text: string): Promise<IntentResult> {
    const normalized = text.trim().toLowerCase();
    const empty: IntentResult = {
      intent: 'UNKNOWN',
      interpretedRequest: text.trim() || 'Unspecified request',
      confidence: 0.2,
      serviceCandidate: null,
      serviceCandidateCode: null,
      candidates: [],
      entities: {
        companyName: null,
        licenseNumber: null,
        expiryDate: null,
        personName: null,
      },
      provider: 'MOCK',
      note: 'Mock intent provider — no OpenAI call.',
    };

    if (!normalized) return Promise.resolve(empty);

    const entities = this.extractEntities(text);
    const scored: Array<{
      serviceCode: string;
      serviceNameHint: string;
      confidence: number;
    }> = [];

    const tradeScore = this.scoreTradeLicense(normalized);
    if (tradeScore > 0) {
      scored.push({
        serviceCode: 'TRADE_LICENSE_RENEWAL',
        serviceNameHint: 'Trade License Renewal',
        confidence: tradeScore,
      });
    }

    const eidScore = this.scoreEmiratesId(normalized);
    if (eidScore > 0) {
      scored.push({
        serviceCode: 'EMIRATES_ID_UPDATE',
        serviceNameHint: 'Emirates ID Update',
        confidence: eidScore,
      });
    }

    const permitScore = this.scoreCommercialPermit(normalized);
    if (permitScore > 0) {
      scored.push({
        serviceCode: 'COMMERCIAL_PERMIT',
        serviceNameHint: 'Commercial Permit',
        confidence: permitScore,
      });
    }

    scored.sort((a, b) => b.confidence - a.confidence);

    if (scored.length === 0) {
      return Promise.resolve({
        ...empty,
        entities,
        interpretedRequest: text.trim(),
      });
    }

    const top = scored[0];
    return Promise.resolve({
      intent: 'SERVICE_REQUEST',
      interpretedRequest: this.summarize(top.serviceNameHint, normalized),
      confidence: top.confidence,
      serviceCandidate: top.serviceNameHint,
      serviceCandidateCode: top.serviceCode,
      candidates: scored.slice(0, 3),
      entities,
      provider: 'MOCK',
      note: 'Mock intent provider — deterministic keyword matching.',
    });
  }

  private scoreTradeLicense(text: string): number {
    let score = 0;
    if (/(trade\s*license|business\s*license|commercial\s*license)/.test(text))
      score += 0.55;
    if (/(renew|renewal|expir|expiring|expire)/.test(text)) score += 0.35;
    if (/(company|business|llc|corp)/.test(text)) score += 0.08;
    if (/license/.test(text) && !/emirates\s*id/.test(text)) score += 0.1;
    return Math.min(0.98, score);
  }

  private scoreEmiratesId(text: string): number {
    let score = 0;
    if (/(emirates\s*id|eid|national\s*id)/.test(text)) score += 0.6;
    if (/(update|renew|replace|change)/.test(text)) score += 0.28;
    if (/(identity|id\s*card)/.test(text)) score += 0.1;
    return Math.min(0.97, score);
  }

  private scoreCommercialPermit(text: string): number {
    let score = 0;
    if (/(commercial\s*permit|business\s*permit|trade\s*permit)/.test(text))
      score += 0.62;
    if (/(apply|application|new\s*permit|permit)/.test(text)) score += 0.25;
    if (/(activity|location)/.test(text)) score += 0.08;
    return Math.min(0.95, score);
  }

  private extractEntities(text: string): IntentResult['entities'] {
    const company =
      text
        .match(
          /(?:company|business)\s+(?:name\s+)?(?:is\s+)?([A-Za-z0-9 .,&'-]{2,60})/i,
        )?.[1]
        ?.trim() ?? null;
    const license =
      text.match(
        /(?:license|licence)\s*(?:number|no\.?#?)?\s*[:#]?\s*([A-Z0-9-]{4,20})/i,
      )?.[1] ?? null;
    const expiry =
      text.match(
        /(?:expir(?:y|es|ing)?|until)\s*(?:on\s+|date\s+)?(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|next\s+month)/i,
      )?.[1] ?? null;

    return {
      companyName: company,
      licenseNumber: license,
      expiryDate:
        expiry?.toLowerCase() === 'next month' ? 'NEXT_MONTH' : expiry,
      personName: null,
    };
  }

  private summarize(serviceName: string, text: string): string {
    if (/expir/.test(text)) return `${serviceName} due to upcoming expiry`;
    if (/renew/.test(text)) return `${serviceName} renewal request`;
    if (/update/.test(text)) return `${serviceName} update request`;
    return `${serviceName} service request`;
  }
}

@Injectable()
export class MockDocumentAnalysisProvider implements DocumentAnalysisProvider {
  analyze(input: {
    fileName: string;
    mimeType: string;
    documentTypeHint?: string | null;
  }): Promise<DocumentAnalysisResult> {
    const lower = input.fileName.toLowerCase();
    const isImage = input.mimeType.startsWith('image/');
    const classifiedType = this.classify(lower, input.documentTypeHint);
    const confidence =
      classifiedType === 'UNKNOWN' ? 0.35 : isImage ? 0.82 : 0.94;

    const fields = this.mockFields(classifiedType);
    const qualityWarn =
      isImage || lower.includes('emirates') || lower.includes('blur');

    const issues: DocumentAnalysisResult['issues'] = [];
    if (qualityWarn) {
      issues.push({
        code: 'QUALITY_LOW',
        severity: 'warning',
        message: 'Image quality appears low (demo AI check).',
      });
    }
    if (classifiedType === 'UNKNOWN') {
      issues.push({
        code: 'UNCLASSIFIED',
        severity: 'warning',
        message: 'Document type could not be confidently classified.',
      });
    }

    const validationScore = qualityWarn
      ? 70
      : classifiedType === 'UNKNOWN'
        ? 55
        : 95;
    const qualityScore = qualityWarn ? 0.55 : 0.92;

    return Promise.resolve({
      provider: 'MOCK',
      documentType: classifiedType,
      classifiedType,
      confidence,
      fields,
      checks: {
        imageQuality: qualityWarn ? 'WARN' : isImage ? 'PASS' : 'SKIP',
        expiry: fields.expiryDate ? 'PASS' : 'SKIP',
        requiredFields:
          Object.values(fields).filter(Boolean).length >= 2 ? 'PASS' : 'WARN',
      },
      summary: qualityWarn
        ? `Demo AI analysis: ${classifiedType} detected with quality warning.`
        : `Demo AI analysis: ${classifiedType} accepted.`,
      validationScore,
      qualityScore,
      issues,
      status: 'MOCK',
    });
  }

  private classify(fileName: string, hint?: string | null): string {
    if (hint && hint !== 'UNKNOWN') return hint.toUpperCase();
    if (fileName.includes('passport')) return 'PASSPORT';
    if (fileName.includes('emirates') || fileName.includes('eid'))
      return 'EMIRATES_ID';
    if (fileName.includes('tenancy') || fileName.includes('tawtheeq'))
      return 'TENANCY_CONTRACT';
    if (fileName.includes('moa') || fileName.includes('memorandum'))
      return 'MEMORANDUM_OF_ASSOCIATION';
    if (fileName.includes('trade_name') || fileName.includes('tradename'))
      return 'TRADE_NAME_CERTIFICATE';
    if (fileName.includes('license') || fileName.includes('licence'))
      return 'TRADE_LICENSE';
    if (fileName.includes('noc')) return 'NOC';
    return 'UNKNOWN';
  }

  private mockFields(type: string): Record<string, string | null> {
    switch (type) {
      case 'EMIRATES_ID':
        return {
          fullName: 'Khalid Al-Mansoori',
          idNumber: '784-XXXX-XXXXXXX-1',
          expiryDate: '2028-04-12',
        };
      case 'PASSPORT':
        return {
          fullName: 'Khalid Al-Mansoori',
          passportNumber: 'C1234567',
          expiryDate: '2029-01-20',
        };
      case 'TRADE_LICENSE':
        return {
          companyName: 'Tech Innovations LLC',
          licenseNumber: 'CN-784512',
          expiryDate: '2026-09-15',
        };
      case 'TENANCY_CONTRACT':
        return {
          tenantName: 'Tech Innovations LLC',
          expiryDate: '2026-08-23',
          propertyRef: 'DEMO-UNIT-12',
        };
      case 'MEMORANDUM_OF_ASSOCIATION':
      case 'MOA':
        return {
          companyName: 'Tech Innovations LLC',
          partners: '2',
          expiryDate: null,
        };
      default:
        return { fullName: null, idNumber: null, expiryDate: null };
    }
  }
}

@Injectable()
export class MockAIProvider implements AIProvider {
  isEnabled() {
    return false;
  }

  providerName() {
    return 'MOCK';
  }
}
