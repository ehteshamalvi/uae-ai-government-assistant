import { Injectable } from '@nestjs/common';
import type {
  CopilotAIProvider,
  CopilotGenerateInput,
  CopilotGenerateResult,
  CopilotSource,
  CopilotSuggestedAction,
} from './copilot-ai.types';
import { actionHref } from './copilot-ai.types';

/**
 * Deterministic Copilot responder using classified intent + live context.
 * Not OpenAI — does not invent official policy.
 */
@Injectable()
export class MockCopilotAIProvider implements CopilotAIProvider {
  providerName() {
    return 'MOCK';
  }

  isEnabled() {
    return true;
  }

  generate(input: CopilotGenerateInput): Promise<CopilotGenerateResult> {
    const ctx = input.transactionContext;
    const ref = ctx?.referenceCode;

    if (input.queryClass === 'GUARDRAIL_QUERY') {
      return Promise.resolve(
        this.result(
          'No. This GovFlow environment is a sandbox demonstration and does not connect to government systems. It is not affiliated with TAMM, DubaiNow, or any UAE government entity.',
          0.99,
          'HIGH',
          [
            {
              type: 'GovFlow Knowledge Base',
              title: 'Sandbox Environment Disclaimer',
            },
          ],
          [
            {
              code: 'OPEN_MONITORING',
              label: 'Open Monitoring',
              href: actionHref('OPEN_MONITORING', ref),
            },
          ],
        ),
      );
    }

    if (input.queryClass === 'READINESS_QUERY' && ctx) {
      const b = ctx.readiness.breakdown;
      const warnings = ctx.readiness.issues.filter(
        (i) => i.severity === 'warning',
      );
      const answer = `Your transaction ${ctx.referenceCode} is ${ctx.readiness.score}% ready (${ctx.readiness.status.replaceAll('_', ' ')}). Information score ${Math.round(b.information.score)}% (${b.information.completed}/${b.information.required} fields), documents ${Math.round(b.documents.score)}% (${b.documents.completed}/${b.documents.required}), validation ${Math.round(b.validation.score)}%.${
        warnings.length
          ? ` Document validation still has ${warnings.length} unresolved warning(s), which can keep readiness below 100%.`
          : ' No validation warnings are currently recorded.'
      } Readiness is calculated by the deterministic readiness engine — not by inventing a new score.`;
      return Promise.resolve(
        this.result(
          answer,
          0.92,
          'HIGH',
          [
            {
              type: 'Transaction Readiness',
              title: 'Readiness calculation',
              referenceId: ctx.referenceCode,
            },
            { type: 'Document Analysis', title: 'Document validation' },
          ],
          [
            {
              code: 'REVIEW_READINESS',
              label: 'Review Readiness',
              href: actionHref('REVIEW_READINESS', ref),
            },
            {
              code: 'REVIEW_DOCUMENT',
              label: 'Review flagged documents',
              href: actionHref('REVIEW_DOCUMENT', ref),
            },
          ],
        ),
      );
    }

    if (input.queryClass === 'MISSING_REQUIREMENTS_QUERY' && ctx) {
      const missing = ctx.readiness.missingRequirements.filter(
        (m) => m.status === 'MISSING',
      );
      const incompleteFields = ctx.fields.filter((f) => !f.value?.trim());
      if (missing.length === 0 && incompleteFields.length === 0) {
        return Promise.resolve(
          this.result(
            `Nothing mandatory appears missing for ${ctx.referenceCode}. You may still have warnings to review before final submission.`,
            0.88,
            'HIGH',
            [{ type: 'Service Requirements', title: 'Requirements checklist' }],
            [
              {
                code: 'OPEN_FINAL_REVIEW',
                label: 'Open Final Review',
                href: actionHref('OPEN_FINAL_REVIEW', ref),
              },
            ],
          ),
        );
      }
      const lines = [
        ...missing.map((m) => `• ${m.labelEn} (${m.type})`),
        ...incompleteFields.slice(0, 5).map((f) => `• Field: ${f.labelEn}`),
      ];
      return Promise.resolve(
        this.result(
          `For ${ctx.referenceCode}, these items still need attention:\n${lines.join('\n')}`,
          0.9,
          'HIGH',
          [{ type: 'Service Requirements', title: 'Missing requirements' }],
          [
            {
              code: 'COMPLETE_INFORMATION',
              label: 'Complete Information',
              href: actionHref('COMPLETE_INFORMATION', ref),
            },
            {
              code: 'UPLOAD_DOCUMENT',
              label: 'Upload Document',
              href: actionHref('UPLOAD_DOCUMENT', ref),
            },
          ],
        ),
      );
    }

    if (input.queryClass === 'DOCUMENT_QUERY' && ctx) {
      const docs = ctx.documents;
      if (docs.length === 0) {
        return Promise.resolve(
          this.result(
            'No documents are attached to this transaction yet. Upload required documents from the workspace.',
            0.85,
            'HIGH',
            [{ type: 'Document Analysis', title: 'Documents' }],
            [
              {
                code: 'UPLOAD_DOCUMENT',
                label: 'Upload Document',
                href: actionHref('UPLOAD_DOCUMENT', ref),
              },
            ],
          ),
        );
      }
      const focus =
        docs.find((d) => /emirates/i.test(d.documentType ?? d.fileName)) ??
        docs.find((d) => d.status === 'WARNING') ??
        docs[0];
      const answer = `Document "${focus.documentType ?? focus.fileName}" is currently ${focus.status}.${
        focus.analysisSummary ? ` Demo AI check: ${focus.analysisSummary}` : ''
      } This is a sandbox analysis label, not legal verification.`;
      return Promise.resolve(
        this.result(
          answer,
          focus.status === 'WARNING' ? 0.8 : 0.9,
          focus.status === 'WARNING' ? 'MEDIUM' : 'HIGH',
          [
            {
              type: 'Document Analysis',
              title: focus.documentType ?? focus.fileName,
              referenceId: focus.id,
            },
          ],
          [
            {
              code: 'REVIEW_DOCUMENT',
              label: 'Review Document',
              href: actionHref('REVIEW_DOCUMENT', ref),
            },
          ],
        ),
      );
    }

    if (input.queryClass === 'PAYMENT_QUERY' && ctx) {
      const answer = ctx.payment.required
        ? `Sandbox payment for ${ctx.referenceCode}: status ${ctx.payment.statusLabel}, total AED ${ctx.payment.totalAmount.toFixed(2)}. No real money is charged in this demo.`
        : `Payment is not required for ${ctx.referenceCode} in the current fee configuration.`;
      return Promise.resolve(
        this.result(
          answer,
          0.93,
          'HIGH',
          [{ type: 'Payment Summary', title: 'Sandbox payment' }],
          [
            {
              code: 'OPEN_PAYMENT',
              label: 'Open Payment',
              href: actionHref('OPEN_PAYMENT', ref),
            },
          ],
        ),
      );
    }

    if (
      (input.queryClass === 'STATUS_QUERY' ||
        input.queryClass === 'NEXT_STEP_QUERY' ||
        input.queryClass === 'GENERAL_TRANSACTION_QUERY') &&
      ctx
    ) {
      const afterPay =
        /after\s*payment|after\s*submission/i.test(input.message) ||
        input.queryClass === 'NEXT_STEP_QUERY';
      const kbBit = input.knowledgeChunks[0]?.content
        ? ` ${input.knowledgeChunks[0].content.slice(0, 220)}`
        : '';
      const answer = afterPay
        ? `Current status for ${ctx.referenceCode} is ${ctx.status}. Next recommended action: ${ctx.nextAction.label} — ${ctx.nextAction.reason}.${
            ctx.submissionReference
              ? ` Submission reference: ${ctx.submissionReference}.`
              : ''
          }${kbBit}`
        : `${ctx.service.nameEn} (${ctx.referenceCode}) is ${ctx.status}. Readiness ${ctx.readiness.score}%. Recommended next step: ${ctx.nextAction.label}.`;
      return Promise.resolve(
        this.result(
          answer,
          0.9,
          'HIGH',
          [
            { type: 'Transaction Timeline', title: 'Lifecycle status' },
            ...(input.knowledgeChunks[0]
              ? [
                  {
                    type: 'GovFlow Knowledge Base',
                    title: input.knowledgeChunks[0].title,
                  } satisfies CopilotSource,
                ]
              : []),
          ],
          [
            {
              code: 'OPEN_MONITORING',
              label: 'Open Monitoring',
              href: actionHref('OPEN_MONITORING', ref),
            },
            {
              code: ctx.nextAction.code.startsWith('REVIEW')
                ? 'OPEN_FINAL_REVIEW'
                : 'PREPARE_APPLICATION',
              label: ctx.nextAction.label,
              href: actionHref('PREPARE_APPLICATION', ref),
            },
          ],
        ),
      );
    }

    // Knowledge answers only when retrieval already passed relevance threshold
    if (
      input.queryClass === 'KNOWLEDGE_QUERY' &&
      input.knowledgeChunks.length > 0
    ) {
      const top = input.knowledgeChunks[0];
      return Promise.resolve(
        this.result(
          `From GovFlow Demo Knowledge (not official government guidance): ${top.content.slice(0, 500)}${top.content.length > 500 ? '…' : ''}`,
          0.75,
          'MEDIUM',
          [
            {
              type: 'GovFlow Knowledge Base',
              title: top.title,
              referenceId: top.documentId,
            },
          ],
          ctx
            ? [
                {
                  code: 'VIEW_READINESS',
                  label: 'View readiness',
                  href: actionHref('VIEW_READINESS', ref),
                },
                {
                  code: 'OPEN_TRANSACTION',
                  label: 'Open transaction',
                  href: actionHref('OPEN_TRANSACTION', ref),
                },
              ]
            : [
                {
                  code: 'OPEN_SEARCH',
                  label: 'Browse services',
                  href: actionHref('OPEN_SEARCH'),
                },
              ],
        ),
      );
    }

    // UNKNOWN / low-relevance: never invent or dump unrelated service KB
    const unknownActions = ctx
      ? [
          {
            code: 'OPEN_TRANSACTION',
            label: 'View transaction',
            href: actionHref('OPEN_TRANSACTION', ref),
          },
          {
            code: 'VIEW_REQUIREMENTS',
            label: 'View requirements',
            href: actionHref('VIEW_REQUIREMENTS', ref),
          },
          {
            code: 'VIEW_READINESS',
            label: 'Open readiness',
            href: actionHref('VIEW_READINESS', ref),
          },
        ]
      : [
          {
            code: 'OPEN_SEARCH',
            label: 'View services',
            href: actionHref('OPEN_SEARCH'),
          },
        ];

    return Promise.resolve(
      this.result(
        "I don't have enough relevant information in the GovFlow demo knowledge base to answer that. Ask about your current transaction, view requirements, open readiness, or try a more specific question. I will not invent official government answers.",
        0.35,
        'LOW',
        [],
        unknownActions,
        true,
      ),
    );
  }

  private result(
    answer: string,
    confidence: number,
    confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW',
    sources: CopilotSource[],
    suggestedActions: CopilotSuggestedAction[],
    noKnowledge = false,
  ): CopilotGenerateResult {
    return {
      answer,
      confidence,
      confidenceBand,
      sources,
      suggestedActions,
      noKnowledge,
    };
  }
}
