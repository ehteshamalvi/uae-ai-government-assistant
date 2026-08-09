# GovFlow AI — System Architecture

**Product:** GovFlow AI — AI-powered Digital Transaction Intelligence  
**Status:** Phase 6 complete (council-ready sandbox hardening)  
**Architecture style:** Modular monolith (single deployable API + SPA)

> **Disclaimer:** GovFlow AI is a demonstration/sandbox platform. It is **not** affiliated with TAMM, DubaiNow, Abu Dhabi Government, Dubai Government, or any other government entity. All submissions, payments, and approvals are simulated.

---

## Core separation (Phase 6)

```
AI recommends → Deterministic services enforce → User confirms → Workflow executes
```

| Layer | Responsibility |
|-------|----------------|
| **AI** | Intent understanding, knowledge retrieval, Copilot explanations, suggested actions (allowlisted) |
| **Transaction layer** | Ownership, preparation, fields, documents, lifecycle |
| **Readiness engine** | Deterministic scores (documents / information / validation) — never invented by the LLM |
| **RAG (demo)** | Local keyword knowledge retrieval (`demo-knowledge.json`) — not production vector search |
| **Copilot** | Orchestrator → Context Builder → Knowledge Retriever → Mock AI Provider → validated response |
| **Sandbox payment** | Fee quote + simulated SUCCESS/FAILURE — no card data |
| **State machine** | Explicit allowed transitions; sandbox advance/reset gated by `DEMO_MODE` |
| **Security boundaries** | CORS allowlist, Helmet, throttling, validation, request IDs, ownership checks |

OpenAI is optional (`AI_PROVIDER=mock` default). LangGraph / autonomous agents are **not** in scope.

---

## 1. Current Project Status

### Implemented (Phases 1–6)

- React SPA + NestJS API + Prisma/PostgreSQL + Redis abstraction
- Intent → Service → Transaction → Preparation → Documents → Readiness → Review → Sandbox Payment → Submit → Monitor → Complete
- Context-aware Copilot with demo knowledge + guardrails
- Council Demo Mode (`/demo`), security hardening, CI, Docker Compose (Postgres + Redis)

### Explicitly out of scope (Phase 7+)

- Real government APIs, UAE Pass, real payments, real OCR
- Production OpenAI requirement, vector DB, LangGraph agents, WhatsApp/SMS/email

### Canonical UI

Stitch archive: `stitch/original/`. Design tokens from `stitch/original/govflow_ai/DESIGN.md`.

---

## 2. Target Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (SPA)                              │
│  React + Vite + TS + Tailwind + TanStack Query + Zustand + RR   │
│  Stitch visual language · Demo Mode · EN/AR RTL                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS + X-Request-Id
┌────────────────────────────▼────────────────────────────────────┐
│                   NestJS Modular Monolith                        │
│  auth │ users │ roles │ services │ requirements │ transactions │ │
│  documents │ document-analysis │ intent │ ai │ workflow        │ │
│  payments │ notifications │ audit │ copilot │ demo │ health    │ │
└───────┬──────────────────┬──────────────────┬───────────────────┘
        │                  │                  │
   PostgreSQL           Redis            AI Provider
   (Prisma)        (or memory fallback)  (mock default)
```

**Principles**

1. **Modular monolith first** — no microservices until clear scale/isolation need.  
2. **Sandbox transaction layer** — simulate prepare → review → pay → submit → process → complete.  
3. **Provider abstractions** — OCR, LLM, payments behind interfaces.  
4. **Business logic in services** — React renders; Nest decides.  
5. **Explainable AI** — concise evidence; no chain-of-thought.  
6. **AI never executes** payment, submission, delete, or status change.

---

## 3. Proposed Monorepo Folder Structure

```
UAE_digital_service_assistant/
├── apps/
│   ├── web/                          # React + Vite SPA
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/                  # router, providers, layout shells
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── intent-search/
│   │   │   │   ├── readiness/
│   │   │   │   ├── documents/
│   │   │   │   ├── workspace/
│   │   │   │   ├── final-review/
│   │   │   │   ├── payment/
│   │   │   │   ├── monitoring/
│   │   │   │   ├── copilot/
│   │   │   │   ├── history/
│   │   │   │   └── settings/
│   │   │   ├── shared/
│   │   │   │   ├── components/       # Button, Card, StatusChip, Stepper…
│   │   │   │   ├── hooks/
│   │   │   │   ├── lib/              # api client, query keys
│   │   │   │   ├── stores/           # Zustand (session, UI, active txn)
│   │   │   │   └── i18n/             # en / ar
│   │   │   ├── styles/               # Tailwind + design tokens from DESIGN.md
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── api/                          # NestJS modular monolith
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/               # guards, filters, pipes, decorators
│       │   ├── config/               # env validation (Zod/Joi)
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── roles/
│       │   │   ├── services/         # service catalog
│       │   │   ├── requirements/
│       │   │   ├── transactions/
│       │   │   ├── documents/
│       │   │   ├── document-analysis/
│       │   │   ├── intent/
│       │   │   ├── ai/               # orchestrator + LangGraph graphs
│       │   │   ├── workflow/         # sandbox state machine
│       │   │   ├── payments/
│       │   │   ├── notifications/
│       │   │   ├── audit/
│       │   │   └── copilot/
│       │   └── providers/            # OCR, LLM, vector, payment adapters
│       ├── test/
│       ├── Dockerfile
│       ├── nest-cli.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                         # optional shared types later
│   └── shared-types/                 # DTOs / enums shared FE↔BE (Phase 2+)
│
├── stitch/                           # archive of original Stitch exports
│   └── (move current HTML folders here after bootstrap)
│
├── docs/
│   ├── ARCHITECTURE.md               # this file
│   ├── DATABASE.md
│   ├── API.md
│   ├── AI-ARCHITECTURE.md
│   └── IMPLEMENTATION-PLAN.md
│
├── .github/workflows/
│   ├── ci.yml
│   └── ...
├── docker-compose.yml                # postgres, redis, api, web
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Frontend Architecture

### Stack

| Concern | Choice |
|---------|--------|
| UI | React 18+ + TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS (tokens from `govflow_ai/DESIGN.md`) |
| Data fetching | TanStack Query |
| Client state | Zustand (auth session mirror, active transaction context, UI chrome) |
| Routing | React Router |
| Icons | Material Symbols Outlined (as in Stitch) |
| i18n | English / Arabic (RTL-ready layout shells) |

### Feature modules (UI)

| Feature | Route (proposed) | Stitch source |
|---------|------------------|---------------|
| Auth | `/login`, `/register` | **Missing — new** |
| Dashboard | `/` | `ai_dashboard` |
| Intent Search | `/intent` | `ai_intent_search` |
| Readiness | `/transactions/:id/readiness` | `transaction_readiness` |
| Document Intelligence | `/transactions/:id/documents` | readiness + workspace fragments |
| Workspace | `/transactions/:id/workspace` | `transaction_workspace` |
| Final Review | `/transactions/:id/review` | **Missing — new** (extend workspace) |
| Payment Review | `/transactions/:id/payment` | Live (sandbox) |
| Final Review | `/transactions/:id/review` | Live |
| Monitor | `/transactions/:id/monitor` | Live |

| Monitoring | `/transactions/:id/monitor` | `ai_transaction_monitor` |
| Copilot | `/copilot` (+ contextual drawer) | `transaction_copilot` |
| History | `/history` | `transaction_history_2` |
| Settings | `/settings` | `settings` |

### Shell patterns to preserve

- **Desktop:** left drawer (~320px), brand “GovFlow AI”, user card, nav  
- **Mobile:** top app bar + bottom nav (`Home` / `Search` / `AI Chat` / `History` / `Settings`)  
- **Focused transactional views:** suppress global nav (as in workspace)  
- **Visual language:** glass panels, cyan AI insight borders, navy-tinted shadows, rounded cards  

### State boundaries

- **Server state** → TanStack Query (transactions, documents, readiness, history)  
- **Active transaction context** → Zustand (for Copilot + cross-screen continuity)  
- **Auth tokens** → memory + httpOnly cookie preference; never commit secrets  

---

## 5. Backend Architecture

### Modular monolith modules

| Module | Responsibility |
|--------|----------------|
| `auth` | JWT issue/refresh, login/register, password hashing |
| `users` | Profile, preferences, locale |
| `roles` | RBAC roles + permissions |
| `services` | Service catalog (Trade License, Emirates ID, Commercial Permit) |
| `requirements` | Fields + document requirements per service |
| `transactions` | Transaction CRUD, fields, readiness snapshot |
| `documents` | Upload, access control, metadata |
| `document-analysis` | Classification, validation results (mock or real) |
| `intent` | NL → intent + service candidates |
| `ai` | LangGraph orchestrator, agent runners, explanations |
| `workflow` | Sandbox status machine + step transitions |
| `payments` | Sandbox fee calculation + payment review records |
| `notifications` | In-app alerts (monitoring delays, readiness issues) |
| `audit` | Append-only audit events |
| `copilot` | Contextual Q&A grounded in transaction context |

### Cross-cutting

- Global validation pipes (class-validator DTOs)  
- Exception filters with stable error codes  
- JWT + RBAC guards  
- Rate limiting (Nest throttler / Redis-backed)  
- Config module with required env vars; fail-fast on missing secrets  
- Audit interceptor for mutating AI/workflow actions  

---

## 6. Core Domain Lifecycle

```
UNDERSTAND → IDENTIFY → PREPARE → VALIDATE → REVIEW → PAY/SUBMIT → MONITOR
```

Mapped to sandbox workflow statuses (see `DATABASE.md`):

`DRAFT` → `IDENTIFIED` → `PREPARING` → `READY_FOR_REVIEW` → `PAYMENT_PENDING` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` → `ISSUED` | `REJECTED` | `NEEDS_ACTION`

---

## 7. Readiness Engine

Computed **only** in backend `ReadinessService` (never hard-coded in UI).

**Weighted factors (initial):**

| Factor | Weight | Example signal |
|--------|--------|----------------|
| Required documents present | 30% | matched docs / required docs |
| Information completeness | 25% | required fields filled |
| Document validation | 25% | avg validation score / pass rate |
| Potential issues | 10% | open warnings/errors (inverse) |
| Missing requirements | 10% | unmet requirements (inverse) |

Returns score + **explainable breakdown** for UI (“Why is readiness 82%?”).

---

## 8. Sandbox Transaction Layer

`SandboxWorkflowService` advances steps on timers or explicit demo actions:

1. Application prepared  
2. Documents verified  
3. Sandbox submission  
4. Department review (simulated delay + optional AI delay alert)  
5. Final approval  
6. Issuance  

UI must label sandbox/demo data clearly where appropriate.

---

## 9. Provider Abstractions Interfaces

```
ILlmProvider          → OpenAI (real) | MockLlmProvider
IEmbeddingProvider    → OpenAI embeddings | mock vectors
IVectorStore          → pgvector / external; swap without rewrite
IOcrProvider          → MockOcrProvider | future real OCR
IDocumentAnalyzer     → MockDocumentAnalyzer | AIDocumentAnalyzer
IPaymentProvider      → SandboxPaymentProvider | future PSP
```

When `OPENAI_API_KEY` (or OCR keys) are absent, system uses safe mock analysis so demos remain reliable.

---

## 10. Security Baseline

- JWT authentication + refresh strategy  
- RBAC (e.g. `USER`, `ADMIN`)  
- Protected routes (FE) + guards (BE)  
- Document access scoped to owner (and admin)  
- Input/DTO validation; file type/size limits  
- Env-based secrets; `.env` never committed  
- Rate limiting on auth, intent, copilot, upload  
- Audit log without storing document binary/content  

---

## 11. Infrastructure

| Component | Role |
|-----------|------|
| Docker Compose | `postgres`, `redis`, `api`, `web` |
| PostgreSQL | Primary store (+ optional pgvector extension later) |
| Redis | Cache, rate-limit counters, optional job queues |
| GitHub Actions | Lint, typecheck, unit tests, build images |
| Env configs | `.env.example` for local; CI secrets for deploy |

---

## 12. Existing UI Reuse Strategy

1. Extract **design tokens** from `govflow_ai/DESIGN.md` into Tailwind theme.  
2. Convert each canonical Stitch page into a React **page composition** + shared components.  
3. Replace static numbers with Query-bound data.  
4. Keep layout, spacing, colors, cards, bottom nav, AI insight chrome.  
5. Archive Stitch HTML under `stitch/` after React pages land.  
6. Strip any TAMM/official government branding from reusable layout patterns.

---

## 13. Technical Risks (summary)

| Risk | Mitigation |
|------|------------|
| Stitch HTML duplication / TAMM leftovers | Canonical screen list + archive policy |
| Hard-coded readiness in UI | Single backend scoring service |
| AI cost / unavailable keys | Mock providers by default |
| Over-building OCR | Interfaces + mock analyzer first |
| Affinity / branding confusion | Persistent sandbox disclaimer |
| Scope creep across 3 services | Shared models; primary flow = Trade License Renewal |
| LangGraph complexity early | Thin orchestrator + agent stubs; deepen in later phases |

See `IMPLEMENTATION-PLAN.md` for phased delivery and `AI-ARCHITECTURE.md` for agent design.
