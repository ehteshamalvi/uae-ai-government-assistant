# GovFlow AI — AI Architecture

**Orchestration:** LangGraph (where multi-step agent flows add value)  
**LLM:** OpenAI API via provider interface  
**RAG:** Embeddings + vector store abstraction for service knowledge  
**Safety:** User-facing explanations only — **no chain-of-thought** exposure  

When OpenAI (or OCR) credentials are missing, agents degrade to **deterministic mock analyzers** so demos remain stable.

---

## 1. High-Level Topology

```
                    ┌──────────────────────────┐
                    │     AI Orchestrator       │
                    │   (Nest ai module +       │
                    │    LangGraph graphs)      │
                    └────────────┬─────────────┘
         ┌───────────┬───────────┼───────────┬───────────┐
         ▼           ▼           ▼           ▼           ▼
   Intent Agent  Service ID  Requirement  Document Intel  Validation
                     Agent      Agent         Agent          Agent
         │           │           │              │              │
         └───────────┴─────┬─────┴──────────────┴──────────────┘
                           ▼
              Transaction Preparation Agent
                           ▼
                   Final Review Agent
                           ▼
              Monitoring Agent  ·  Copilot Agent
```

Agents are **logical units** (classes/nodes), not microservices.

---

## 2. Design Principles

1. **Domain-first:** Agents propose; domain services persist and enforce rules.  
2. **Explainable outputs:** Every meaningful AI result stores an `AIInsight` with `summary` + structured `evidence`.  
3. **No CoT leakage:** Prompts may use internal reasoning; API responses never include hidden thoughts.  
4. **Context packing:** Copilot/Monitoring receive curated transaction snapshots, not raw DB dumps.  
5. **Idempotent where possible:** Re-running readiness / analysis updates records without corrupting history (append analysis rows).  
6. **Sandbox honesty:** Copy must never claim real government authority.  

---

## 3. Provider Layer (Phase 3 + Phase 5)

```
apps/api/src/providers/ai/
  ai.interfaces.ts              # IntentProvider, DocumentAnalysisProvider, AIProvider
  mock-ai.providers.ts
  ai-providers.module.ts
  orchestrator.boundary.ts      # includes Copilot node (Mock)

apps/api/src/modules/copilot/
  mock-copilot-ai.provider.ts   # active Copilot AI
  openai-copilot.provider.ts    # boundary only — not live
  copilot-context.builder.ts
  copilot-query.classifier.ts
  copilot.orchestrator.ts

apps/api/knowledge/demo-knowledge.json
apps/api/src/modules/knowledge/local-knowledge.retriever.ts
```

| Piece | Role |
|-------|------|
| `AI_PROVIDER=mock` (default) | MockCopilotAIProvider |
| `AI_PROVIDER=openai` | Requires `OPENAI_API_KEY` or startup fails clearly |
| CopilotContextBuilder | Packs readiness/docs/payment/timeline — no secrets/paths |
| Query classifier | READINESS / MISSING / DOCUMENT / PAYMENT / … |
| LocalKnowledgeRetriever | Demo keyword retrieval (not embeddings) |
| Guardrails | Never claim real government submission/payment |

**AI must not** mutate transaction/payment/readiness — only recommend actions.

---

## 4. Agent Specifications

### 4.1 Intent Agent

| | |
|--|--|
| **Input** | User NL text, locale |
| **Output** | Interpreted request, confidence, keywords, suggested category |
| **Tools** | LLM classify; optional RAG over service descriptions |
| **Persist** | `AIAction`, optional `AIInsight` (INTENT) |

### 4.2 Service Identification Agent

| | |
|--|--|
| **Input** | Intent result + service catalog embeddings/metadata |
| **Output** | Ranked service candidates with scores |
| **Tools** | Vector similarity + LLM re-rank (optional) |
| **Persist** | May create/update `Transaction` when `createTransaction=true` |

### 4.3 Requirement Agent

| | |
|--|--|
| **Input** | `serviceId` |
| **Output** | Required fields + documents from DB (AI may prioritize / explain) |
| **Tools** | Mostly deterministic DB; LLM for natural-language checklist |
| **Persist** | `AIAction` REQUIREMENT_CHECK; seed `TransactionField` stubs |

### 4.4 Document Intelligence Agent

| | |
|--|--|
| **Input** | Document bytes/metadata |
| **Output** | Type classification, extracted metadata, quality flags, expiry |
| **Tools** | OCR provider → LLM structure; mock path returns seeded realistic results |
| **Persist** | `DocumentAnalysis`, update `Document.status` |

**Capabilities (interface):** classification, metadata extraction, OCR-ready pipeline, expiry extraction, name matching hooks, required-field validation, image quality checks, missing-doc detection, status + AI validation summary.

### 4.5 Validation Agent

| | |
|--|--|
| **Input** | Transaction fields + document analyses + requirements |
| **Output** | Validation issues, field verification suggestions |
| **Tools** | Rule engine primary; LLM for soft checks / summaries |
| **Persist** | Issues into readiness inputs; `AIInsight` VALIDATION |

### 4.6 Transaction Preparation Agent

| | |
|--|--|
| **Input** | Validated fields/docs |
| **Output** | Application draft field map with `FieldSource` tags |
| **Tools** | Merge AI-extracted + user + system values |
| **Persist** | `TransactionField`, status → PREPARING / READY_FOR_REVIEW |

### 4.7 Final Review Agent

| | |
|--|--|
| **Input** | Full transaction snapshot |
| **Output** | Go / go-with-warnings / block; user-facing review summary |
| **Tools** | Checklist + LLM narrative summary |
| **Persist** | `AIInsight` FINAL_REVIEW; audit `FINAL_REVIEW_COMPLETED` |

### 4.8 Monitoring Agent

| | |
|--|--|
| **Input** | Workflow timeline, SLA metadata, current status |
| **Output** | Delay alerts, next-step guidance |
| **Tools** | Rules (time in status > SLA) + optional LLM wording |
| **Persist** | `Notification`, `AIInsight` MONITORING |

### 4.9 Copilot Agent

| | |
|--|--|
| **Input** | User question + curated context pack |
| **Output** | Grounded answer + optional citations (field/doc/insight ids) |
| **Tools** | Read-only tools: getReadiness, listMissingDocs, getPayment, getStatus, getWarnings |
| **Persist** | `CopilotMessage`, `AIAction` COPILOT_REPLY |

**Context pack example**

```json
{
  "transactionId": "...",
  "serviceCode": "TRADE_LICENSE_RENEWAL",
  "status": "UNDER_REVIEW",
  "readiness": { "score": 82, "factors": {} },
  "missingDocuments": ["NOC"],
  "warnings": ["Emirates ID image quality low"],
  "payment": { "totalAmount": 2650, "status": "SANDBOX_PAID" },
  "nextStep": "Department Review"
}
```

---

## 5. LangGraph Usage

Use LangGraph for **multi-node journeys**, not for every single LLM call.

### Graph A — `IntentToDraftGraph` (primary demo)

```
START
  → intent_node
  → service_identify_node
  → requirement_node
  → (optional) vault_match_node
  → readiness_snapshot_node   # deterministic service call
  → END (return UI payload + transactionId)
```

### Graph B — `DocumentPipelineGraph`

```
START
  → classify_node
  → extract_node
  → quality_node
  → validate_against_requirements_node
  → summarize_node
  → END
```

### Graph C — `PrepareAndReviewGraph`

```
START
  → prepare_fields_node
  → validation_node
  → readiness_recalc_node
  → final_review_node
  → END
```

### Graph D — `CopilotGraph` (lightweight)

```
START
  → load_context_node (deterministic)
  → route_intent_node (classify user question)
  → tool_or_answer_node
  → END
```

**State object (shared pattern):** `{ transactionId, userId, locale, messages?, intermediate, errors[] }`  
Checkpointing optional later (Redis); v1 can be in-memory per request.

---

## 6. RAG Architecture

**Purpose:** Ground service identification and Copilot answers in curated sandbox knowledge (requirements guides, FAQ), not live government portals.

```
Service guide markdown (seed)
  → chunk
  → embed (IEmbeddingProvider)
  → IVectorStore.upsert
```

**Query path:** embed question → top-k chunks → inject into prompt as evidence → answer with citations to chunk ids (not URLs pretending to be official).

**Phase plan:**  
- Phase 2: in-memory / JSON knowledge  
- Phase 3: pgvector or dedicated vector DB  

---

## 7. Readiness + Explainability

Readiness scoring is **deterministic application logic** (`ReadinessService`), not an LLM invention. Agents may *narrate* the breakdown; they must not invent the percentage.

**Allowed explanation style**

> Why is readiness 82%?  
> Documents: 4/5 available · Information: 100% complete · Validation: 90% · Potential issues: 1 · Missing requirements: 1  

**Forbidden:** model “thinking” traces, hidden prompts, or unverifiable claims of official approval.

---

## 8. Mock / Demo Behavior

| Scenario | Behavior |
|----------|----------|
| No `OPENAI_API_KEY` | `MockLlmProvider` returns templated intent/service matches |
| Document analysis | `MockDocumentAnalyzer` uses filename + mime heuristics + seeded issues (e.g. low-quality Emirates ID) |
| Monitoring delay | Workflow simulator + Monitoring Agent rule |
| Copilot | Template answers for known question classes; LLM if configured |

Mock outputs must still write `DocumentAnalysis.status = MOCK` / provider = `MOCK` for transparency.

---

## 9. Observability & Audit

Each agent run records:

- `AIAction` (type, agentName, latency, success, redacted summaries)  
- Relevant `AuditLog` for business events  
- Never store full document OCR text in audit  

---

## 10. Prompt Safety Guardrails

- System prompts: “You are GovFlow AI, a sandbox demo assistant. You are not a government authority.”  
- Refuse requests to bypass validation in a deceptive way; explain sandbox limitations.  
- Redact secrets from logs.  
- Cap max tokens / truncate context packs.  

---

## 11. Mapping to Product Lifecycle

| Lifecycle stage | Primary agents |
|-----------------|----------------|
| UNDERSTAND | Intent |
| IDENTIFY | Service Identification + Requirement |
| PREPARE | Preparation + Document Intelligence |
| VALIDATE | Validation + ReadinessService |
| REVIEW | Final Review |
| PAY / SUBMIT | Payment module + workflow (AI optional summary) |
| MONITOR | Monitoring + Copilot |

---

## 12. Out of Scope (v1)

- Fine-tuned custom models  
- Real-time vision OCR production SLAs  
- Autonomous submission without user confirmation  
- Multi-agent debate / unconstrained tool use on the public internet  
