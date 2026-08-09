import {
  ACCEPTABLE_DOCUMENT_STATUSES,
  BLOCKING_DOCUMENT_STATUSES,
  type RequirementEvalStatus,
} from './readiness.constants';

export interface RequirementDefinition {
  id: string;
  code: string;
  type: 'FIELD' | 'DOCUMENT' | 'CONSENT' | 'PAYMENT';
  labelEn: string;
  labelAr: string;
  isMandatory: boolean;
  documentType?: string | null;
  sortOrder: number;
}

export interface FieldSnapshot {
  code: string;
  value: string | null;
}

export interface DocumentSnapshot {
  id: string;
  documentType: string | null;
  status: string;
  fileName: string;
}

export interface EvaluatedRequirement {
  requirementId: string;
  code: string;
  type: RequirementDefinition['type'];
  labelEn: string;
  labelAr: string;
  isMandatory: boolean;
  status: RequirementEvalStatus;
  message: string;
  relatedDocumentId?: string;
  relatedFieldCode?: string;
}

export function evaluateRequirements(
  requirements: RequirementDefinition[],
  fields: FieldSnapshot[],
  documents: DocumentSnapshot[],
): EvaluatedRequirement[] {
  const fieldByCode = new Map(fields.map((f) => [f.code, f]));
  const docsByType = new Map<string, DocumentSnapshot[]>();

  for (const doc of documents) {
    if (!doc.documentType) continue;
    const list = docsByType.get(doc.documentType) ?? [];
    list.push(doc);
    docsByType.set(doc.documentType, list);
  }

  return requirements
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((req) => {
      if (req.type === 'FIELD') {
        const field = fieldByCode.get(req.code);
        const complete = Boolean(field?.value?.trim());
        return {
          requirementId: req.id,
          code: req.code,
          type: req.type,
          labelEn: req.labelEn,
          labelAr: req.labelAr,
          isMandatory: req.isMandatory,
          status: complete
            ? ('COMPLETE' as const)
            : req.isMandatory
              ? ('MISSING' as const)
              : ('WARNING' as const),
          message: complete
            ? 'Field completed'
            : req.isMandatory
              ? 'Required field missing'
              : 'Optional field incomplete',
          relatedFieldCode: req.code,
        };
      }

      if (req.type === 'DOCUMENT') {
        const typeKey = req.documentType ?? req.code;
        const matches = docsByType.get(typeKey) ?? [];
        if (matches.length === 0) {
          return {
            requirementId: req.id,
            code: req.code,
            type: req.type,
            labelEn: req.labelEn,
            labelAr: req.labelAr,
            isMandatory: req.isMandatory,
            status: req.isMandatory
              ? ('MISSING' as const)
              : ('WARNING' as const),
            message: req.isMandatory
              ? 'Required document missing'
              : 'Optional document not uploaded',
          };
        }

        const blocking = matches.find((d) =>
          BLOCKING_DOCUMENT_STATUSES.has(d.status),
        );
        if (blocking) {
          return {
            requirementId: req.id,
            code: req.code,
            type: req.type,
            labelEn: req.labelEn,
            labelAr: req.labelAr,
            isMandatory: req.isMandatory,
            status: 'BLOCKED' as const,
            message: `Document ${blocking.fileName} is ${blocking.status.toLowerCase()}`,
            relatedDocumentId: blocking.id,
          };
        }

        const warning = matches.find((d) => d.status === 'WARNING');
        if (warning) {
          return {
            requirementId: req.id,
            code: req.code,
            type: req.type,
            labelEn: req.labelEn,
            labelAr: req.labelAr,
            isMandatory: req.isMandatory,
            status: 'WARNING' as const,
            message: `Document ${warning.fileName} needs attention`,
            relatedDocumentId: warning.id,
          };
        }

        const acceptable = matches.find((d) =>
          ACCEPTABLE_DOCUMENT_STATUSES.has(d.status),
        );
        if (acceptable) {
          return {
            requirementId: req.id,
            code: req.code,
            type: req.type,
            labelEn: req.labelEn,
            labelAr: req.labelAr,
            isMandatory: req.isMandatory,
            status: 'COMPLETE' as const,
            message: 'Document accepted',
            relatedDocumentId: acceptable.id,
          };
        }

        return {
          requirementId: req.id,
          code: req.code,
          type: req.type,
          labelEn: req.labelEn,
          labelAr: req.labelAr,
          isMandatory: req.isMandatory,
          status: 'WARNING' as const,
          message: 'Document uploaded but not yet validated',
          relatedDocumentId: matches[0]?.id,
        };
      }

      // CONSENT / PAYMENT — Phase 2 treats as optional metadata requirements
      return {
        requirementId: req.id,
        code: req.code,
        type: req.type,
        labelEn: req.labelEn,
        labelAr: req.labelAr,
        isMandatory: req.isMandatory,
        status: 'COMPLETE' as const,
        message: `${req.type} requirement deferred to later workflow step`,
      };
    });
}
