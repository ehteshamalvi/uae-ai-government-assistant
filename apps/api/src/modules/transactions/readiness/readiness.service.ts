import { Injectable } from '@nestjs/common';
import {
  READINESS_THRESHOLDS,
  READINESS_WEIGHTS,
  type ReadinessStatusLabel,
} from './readiness.constants';
import {
  evaluateRequirements,
  type DocumentSnapshot,
  type EvaluatedRequirement,
  type FieldSnapshot,
  type RequirementDefinition,
} from './requirement-evaluator';

export interface ReadinessIssue {
  code: string;
  severity: 'warning' | 'error';
  message: string;
  requirementCode?: string;
}

export interface ReadinessResult {
  score: number;
  status: ReadinessStatusLabel;
  breakdown: {
    documents: { score: number; completed: number; required: number };
    information: { score: number; completed: number; required: number };
    validation: { score: number };
  };
  issues: ReadinessIssue[];
  missingRequirements: Array<{
    code: string;
    labelEn: string;
    type: string;
    status: string;
  }>;
  recommendations: string[];
  evaluations: EvaluatedRequirement[];
  weights: typeof READINESS_WEIGHTS;
}

function clamp(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusFromScore(
  score: number,
  blocked: boolean,
): ReadinessStatusLabel {
  if (blocked) return 'BLOCKED';
  if (score <= READINESS_THRESHOLDS.NOT_STARTED_MAX) return 'NOT_STARTED';
  if (score <= READINESS_THRESHOLDS.IN_PROGRESS_MAX) return 'IN_PROGRESS';
  if (score <= READINESS_THRESHOLDS.ALMOST_READY_MAX) return 'ALMOST_READY';
  return 'READY';
}

@Injectable()
export class ReadinessService {
  calculate(input: {
    requirements: RequirementDefinition[];
    fields: FieldSnapshot[];
    documents: DocumentSnapshot[];
  }): ReadinessResult {
    const evaluations = evaluateRequirements(
      input.requirements,
      input.fields,
      input.documents,
    );

    const documentReqs = evaluations.filter((e) => e.type === 'DOCUMENT');
    const fieldReqs = evaluations.filter((e) => e.type === 'FIELD');
    const mandatoryDocs = documentReqs.filter((e) => e.isMandatory);
    const mandatoryFields = fieldReqs.filter((e) => e.isMandatory);

    const docsRequired = mandatoryDocs.length;
    // WARNING counts toward presence; validation score penalizes incomplete quality
    const docsCompleted = mandatoryDocs.filter(
      (e) => e.status === 'COMPLETE' || e.status === 'WARNING',
    ).length;

    const fieldsRequired = mandatoryFields.length;
    const fieldsCompleted = mandatoryFields.filter(
      (e) => e.status === 'COMPLETE',
    ).length;

    const documentScore =
      docsRequired === 0 ? 100 : (docsCompleted / docsRequired) * 100;
    const informationScore =
      fieldsRequired === 0 ? 100 : (fieldsCompleted / fieldsRequired) * 100;

    const analyzedDocs = documentReqs.filter((e) =>
      Boolean(e.relatedDocumentId),
    );
    const healthyDocs = analyzedDocs.filter((e) => e.status === 'COMPLETE');
    const validationScore =
      analyzedDocs.length === 0
        ? 100
        : (healthyDocs.length / analyzedDocs.length) * 100;

    const raw =
      documentScore * READINESS_WEIGHTS.DOCUMENT_WEIGHT +
      informationScore * READINESS_WEIGHTS.FIELD_WEIGHT +
      validationScore * READINESS_WEIGHTS.VALIDATION_WEIGHT;

    const score = clamp(raw);
    const blocked = evaluations.some(
      (e) => e.isMandatory && e.status === 'BLOCKED',
    );
    const status = statusFromScore(score, blocked);

    const issues: ReadinessIssue[] = evaluations
      .filter((e) => e.status === 'WARNING' || e.status === 'BLOCKED')
      .map((e) => ({
        code: e.code,
        severity:
          e.status === 'BLOCKED' ? ('error' as const) : ('warning' as const),
        message: e.message,
        requirementCode: e.code,
      }));

    const missingRequirements = evaluations
      .filter((e) => e.status === 'MISSING' || e.status === 'BLOCKED')
      .map((e) => ({
        code: e.code,
        labelEn: e.labelEn,
        type: e.type,
        status: e.status,
      }));

    const recommendations: string[] = [];
    for (const missing of missingRequirements) {
      recommendations.push(`Provide ${missing.labelEn} to improve readiness.`);
    }
    for (const issue of issues.filter((i) => i.severity === 'warning')) {
      recommendations.push(
        `Resolve warning on ${issue.code}: ${issue.message}`,
      );
    }
    if (recommendations.length === 0 && status === 'READY') {
      recommendations.push(
        'Transaction requirements look complete. Proceed to review.',
      );
    }

    return {
      score,
      status,
      breakdown: {
        documents: {
          score: clamp(documentScore),
          completed: docsCompleted,
          required: docsRequired,
        },
        information: {
          score: clamp(informationScore),
          completed: fieldsCompleted,
          required: fieldsRequired,
        },
        validation: {
          score: clamp(validationScore),
        },
      },
      issues,
      missingRequirements,
      recommendations,
      evaluations,
      weights: READINESS_WEIGHTS,
    };
  }
}
