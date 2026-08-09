# GovFlow AI — Implementation Plan

**Mode:** Phased delivery  
**Constraint:** Do not implement the full application in one pass. Preserve Stitch visual design.  
**Current phase completed:** Phase 6 — Council-ready hardening, Demo Mode, security, CI/CD & UX polish  

> Phase 7+ (real OpenAI, government APIs, UAE Pass, real payments, OCR, vector DB) is **not started**.

---

## Phase 0 — Analysis (DONE)

- [x] Inspect repository  
- [x] Identify Stitch UI inventory (GovFlow vs TAMM variants)  
- [x] Confirm missing FE/BE infrastructure  
- [x] Propose architecture, DB, API, AI design, folder structure  
- [x] Write `docs/*.md`  

**Exit criteria:** Architecture docs reviewed; go-ahead for Phase 1.

---

## Phase 1 — Foundation Bootstrap (DONE)

**Goal:** Runnable monorepo skeleton with design tokens; no full product yet.

### Completed

- [x] Archive Stitch export to `stitch/original/`
- [x] Scaffold `apps/web` (Vite + React + TS strict + Tailwind 4)
- [x] Port design tokens from `govflow_ai/DESIGN.md`
- [x] App shell: sidebar, top bar, bottom nav, sandbox banner
- [x] Routes for all Phase 1 screens (Stitch ports + login/review/payment placeholders)
- [x] Reusable UI: cards, badges, progress, readiness score, timeline, states
- [x] Zustand locale + active transaction stores; TanStack Query health check
- [x] EN/AR i18n foundation with `dir="rtl"` switching
- [x] Scaffold `apps/api` NestJS modular monolith placeholders
- [x] `GET /api/health` (+ DB/Redis check metadata)
- [x] Prisma schema (full Phase 0 entities) + initial migration
- [x] Seed: demo user, roles/permissions, 3 services, Trade License transaction
- [x] Redis provider abstraction with memory fallback
- [x] `docker-compose.yml` for Postgres + Redis
- [x] Embedded Postgres fallback script when Docker is unavailable
- [x] Root workspace scripts + `.env.example` + `.gitignore` + `README.md`

### Notes

- JWT login is a **placeholder UI** in Phase 1 (seed user exists for later auth wiring).
- Docker was not available in the bootstrap environment; validation used embedded Postgres.
- GitHub Actions CI scaffold may be added/expanded in Phase 6 hardening; local lint/build verified.

**Exit criteria:** Met for foundation — apps build, health responds, routes render, migration/seed succeed, Stitch archived.
---

## Phase 2 — Catalog, Requirements & Transaction Readiness Engine (DONE)

**Goal:** Multi-service catalog + deterministic readiness + live Dashboard/History/Search/Readiness UI.

### Completed

- [x] Services catalog API (`GET /api/services`, `GET /api/services/:id`, requirements)
- [x] Requirements evaluation shared by readiness + UI
- [x] Transactions read APIs (list/detail/steps/fields/documents/readiness/requirements)
- [x] Deterministic `ReadinessService` with configurable weights + status thresholds
- [x] “Why this score?” breakdown from live API data
- [x] Document storage abstraction (`DocumentStorageProvider` + local FS impl)
- [x] Document upload/list/delete with ownership checks + mock analysis provider
- [x] Demo auth boundary (`X-Demo-User-Email` + ownership/RBAC admin bypass hook)
- [x] AI provider placeholders (mock only — no OpenAI/LangGraph)
- [x] Frontend TanStack Query hooks + live Dashboard / Search / History / Readiness
- [x] Unit tests for readiness + requirement evaluation
- [x] Schema enum extension: `RequirementType` += `CONSENT`, `PAYMENT`

### Readiness algorithm (deterministic)

```
score = DOCUMENT_WEIGHT * documentScore
      + FIELD_WEIGHT * fieldScore
      + VALIDATION_WEIGHT * validationScore
```

Weights (must sum to 1.0):

- `DOCUMENT_WEIGHT = 0.40`
- `FIELD_WEIGHT = 0.35`
- `VALIDATION_WEIGHT = 0.25`

Document score = mandatory docs in COMPLETE/WARNING ÷ mandatory docs  
Field score = mandatory completed fields ÷ mandatory fields  
Validation score = uploaded docs in COMPLETE ÷ uploaded docs (optional missing ignored)

Clamped to `[0, 100]`.

### Readiness status thresholds

| Score | Status |
|------:|--------|
| 0–24 | `NOT_STARTED` |
| 25–59 | `IN_PROGRESS` |
| 60–89 | `ALMOST_READY` |
| 90–100 | `READY` |

`BLOCKED` overrides score-based status when any **mandatory** requirement evaluates to `BLOCKED` (e.g. INVALID/EXPIRED document).

### Requirement evaluation statuses

`COMPLETE` | `MISSING` | `WARNING` | `BLOCKED`

### Document storage

- Interface: `DocumentStorageProvider`
- Phase 2 impl: `LocalDocumentStorageProvider` under `apps/api/storage/documents`
- DB stores metadata only (`storageKey`), never file bytes
- Clients never receive filesystem paths

**Exit criteria:** Met — readiness is computed from transaction data; UI screens consume live APIs.

---

## Phase 3 — Intent → Workspace AI Flow — **DONE**

**Goal:** End-to-end primary demo path for Trade License Renewal (mock AI providers).

**Completed:**

1. `IntentProvider` / `MockIntentProvider` + `POST /intent/analyze` (no OpenAI).  
2. Service identification against live Service catalog (never invents services).  
3. Intent Search UI live: NL → confidence bands → Start Transaction.  
4. Dashboard live: active txn, readiness, step, next action, insights.  
5. `DocumentAnalysisProvider` / mock + `POST /documents/:id/analyze`, `GET .../analysis`.  
6. Workspace live: fields with source badges, docs, readiness, prepare CTA.  
7. `POST /transactions`, `POST .../prepare` (idempotent), `GET .../workspace`, `PATCH .../fields`.  
8. Deterministic next-action engine + AIInsight upsert (no duplicate spam).  
9. Readiness remains deterministic; consumes document VALID/WARNING/INVALID.  
10. Orchestrator boundary stub only (no LangGraph runtime).  
11. Unit tests for intent, confidence, next-action, document analysis, readiness integration.

**Exit criteria:** Met — NL renewal → catalog service → create txn → prepare → readiness/workspace.

---

## Phase 4 — Final Review, Payment, Submit, Monitor — **DONE**

**Goal:** Complete sandbox lifecycle after preparation.

**Completed:**

1. Final Review API + checklist + confirmation (`GET/POST .../review`).  
2. Sandbox PaymentProvider + quote from `Service.metadata` (never trust client amounts).  
3. Payment create/process with explicit SUCCESS/FAILURE demo mode.  
4. Submit API with eligibility gates (review + payment + no blockers).  
5. Controlled transaction state machine + sandbox advance.  
6. Monitor API + live Monitor UI timeline.  
7. In-app notifications + audit events for payment/submit/status.  
8. Demo reset: `POST /transactions/:id/sandbox/reset`.  

**Exit criteria:** Met — review → pay → submit → processing → completed (sandbox).

---

## Phase 5 — Copilot, Explainability Polish & Secondary Services — **DONE**

**Goal:** Context-aware Transaction Copilot with mock AI + demo RAG.

**Completed:**

1. Copilot sessions/messages APIs with ownership checks.  
2. CopilotContextBuilder (readiness, docs, payment, timeline — no secrets/paths).  
3. Query classifier + MockCopilotAIProvider (explainable answer/sources/actions).  
4. Demo knowledge base + LocalKnowledgeRetriever (keyword, not embeddings).  
5. OpenAI provider boundary + `AI_PROVIDER` factory (default `mock`).  
6. Guardrails (no fake government submission claims).  
7. Live Copilot UI + Dashboard/Workspace/Readiness entry points.  

**Exit criteria:** Met — Copilot answers from transaction context + demo knowledge without OpenAI.

---

## Phase 6 — Hardening (Production-quality Prototype) — DONE

1. [x] Rate limiting, Helmet, CORS via `WEB_ORIGIN`, request IDs.  
2. [x] OpenAI path remains optional; `AI_PROVIDER=mock` default.  
3. [x] CI: install, Prisma generate, lint, tests, builds.  
4. [x] Security docs, demo gates, ownership, Copilot allowlist/guardrails.  
5. [x] README, Council demo docs, sandbox disclaimers.  
6. [ ] Optional: SSE streaming for Copilot (deferred).  

**Exit criteria:** Met for council-ready sandbox prototype. Docker Compose provides Postgres + Redis; full stack also runs without Docker via embedded Postgres + Redis fallback.

---

## Existing UI Reuse Plan

| Stitch asset | Action |
|--------------|--------|
| `govflow_ai/DESIGN.md` | Source of truth for tokens |
| `ai_dashboard` | Reuse layout → Dashboard feature |
| `ai_intent_search` | Reuse → Intent Search |
| `transaction_readiness` | Reuse → Readiness (+ document intelligence panels) |
| `transaction_workspace` | Reuse → Workspace; extend fields/source badges |
| `ai_transaction_monitor` | Reuse → Monitoring |
| `transaction_copilot` | Reuse → Copilot |
| `transaction_history_2` | Reuse → History |
| `settings` | Reuse → Settings |
| TAMM-branded screens | Reference structure only; strip branding |
| `screen.png` files | Visual QA references during conversion |

### Screens to modify (not redesign)

- Dashboard: bind live data; keep hero prompt + readiness card  
- Intent Search: bind analyze API; keep AI interpretation card  
- Readiness: bind score/docs; keep circular score + checklist  
- Workspace: bind fields/steps; add field source chips if missing  
- Monitor: bind workflow events; keep vertical progress  
- Copilot: bind chat API; keep context card + quick prompts  
- History / Settings: bind list/profile  

### Missing screens / components

| Missing | Priority | Notes |
|---------|----------|-------|
| Login / Register | P0 | No Stitch screen |
| Final Review | P0 | Partial overlap with workspace CTAs |
| Payment Review | P0 | Not present as dedicated page |
| Document upload modal / analyzer detail | P1 | Fragments exist in readiness |
| Sandbox disclaimer / “Demo data” badges | P0 | Cross-cutting |
| Empty / error / loading states | P1 | Not in static HTML |
| Field source badges (AI / User / System) | P1 | Required by product; limited in Stitch |
| Admin seed tooling UI | P2 | Scripts may suffice |

---

## Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rewriting Stitch into React loses fidelity | High | Token-first conversion; screenshot diff QA |
| Hard-coded UI metrics drift from backend | High | Single `ReadinessService`; UI display-only |
| AI cost / flaky demos | High | Default mock providers; golden demo seed |
| Scope: 3 services + full AI graph | Medium | Primary path = Trade License; others share models |
| Accidental government affiliation claims | High | Disclaimers; no official logos; copy review |
| OCR complexity | Medium | Interfaces + mock first |
| LangGraph over-engineering early | Medium | Graphs only for multi-step flows; simple LLM calls elsewhere |
| Document PII in logs | High | Audit without content; redaction policy |
| Monorepo bootstrap churn | Medium | Keep apps thin; shared-types later |

---

## Recommended Next Step

**Proceed to Phase 1 — Foundation Bootstrap** after approval:

1. Create `apps/web` and `apps/api` scaffolds.  
2. Implement Prisma schema + seed roles/demo user.  
3. Port design tokens and shared navigation shells from Stitch.  
4. Archive raw Stitch HTML under `stitch/`.  

Do **not** implement the full AI/transaction flow until Phase 1 exit criteria are met.

---

## Decision Log (initial)

| Decision | Choice |
|----------|--------|
| Architecture | Modular monolith |
| Primary design system | `govflow_ai` (not majestic_digital / not TAMM) |
| Primary demo service | Trade License Renewal |
| AI default mode | Mock-capable; OpenAI optional |
| Payments | Sandbox only |
| Vector DB | Abstracted; memory first |
