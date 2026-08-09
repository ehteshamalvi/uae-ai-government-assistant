export type CopilotQueryClass =
  | 'READINESS_QUERY'
  | 'MISSING_REQUIREMENTS_QUERY'
  | 'DOCUMENT_QUERY'
  | 'PAYMENT_QUERY'
  | 'STATUS_QUERY'
  | 'NEXT_STEP_QUERY'
  | 'SERVICE_QUERY'
  | 'GENERAL_TRANSACTION_QUERY'
  | 'KNOWLEDGE_QUERY'
  | 'GUARDRAIL_QUERY'
  | 'UNKNOWN';

export function classifyCopilotQuery(message: string): CopilotQueryClass {
  const text = message.toLowerCase().trim();
  if (!text) return 'UNKNOWN';

  if (
    /(dubai\s*government|tamm|abu\s*dhabi\s*government|real\s*government|official\s*submission|submitted\s*to\s*(the\s*)?government)/.test(
      text,
    )
  ) {
    return 'GUARDRAIL_QUERY';
  }
  if (
    /(readiness|why.*%\s*ready|why.*ready|score|88\s*%|validation\s*score)/.test(
      text,
    )
  ) {
    return 'READINESS_QUERY';
  }
  if (/(what\s*is\s*missing|missing|incomplete|still\s*need)/.test(text)) {
    return 'MISSING_REQUIREMENTS_QUERY';
  }
  if (
    /(document|emirates\s*id|passport|license\s*copy|tenancy|moa|image\s*quality|warning)/.test(
      text,
    )
  ) {
    return 'DOCUMENT_QUERY';
  }
  if (/(payment|fee|aed|pay|charged|money)/.test(text)) {
    return 'PAYMENT_QUERY';
  }
  if (
    /(after\s*submission|after\s*payment|what\s*happens\s*next|next\s*step|lifecycle|timeline)/.test(
      text,
    )
  ) {
    return 'NEXT_STEP_QUERY';
  }
  if (
    /(status|pending|processing|submitted|completed|where\s*is\s*my)/.test(text)
  ) {
    return 'STATUS_QUERY';
  }
  if (
    /(required\s*documents|what\s*documents|service\s*overview|how\s*do\s*i\s*complete)/.test(
      text,
    )
  ) {
    return 'SERVICE_QUERY';
  }
  if (/(sandbox|knowledge|how\s*does|explain|what\s*is\s*govflow)/.test(text)) {
    return 'KNOWLEDGE_QUERY';
  }
  if (/(transaction|application|renewal|permit)/.test(text)) {
    return 'GENERAL_TRANSACTION_QUERY';
  }
  return 'UNKNOWN';
}

export function needsKnowledgeRetrieval(q: CopilotQueryClass): boolean {
  return (
    q === 'KNOWLEDGE_QUERY' ||
    q === 'SERVICE_QUERY' ||
    q === 'NEXT_STEP_QUERY' ||
    q === 'PAYMENT_QUERY' ||
    q === 'UNKNOWN'
  );
}
