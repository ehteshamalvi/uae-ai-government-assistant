# GovFlow AI — API Design

**Style:** REST JSON over NestJS  
**Auth:** Bearer JWT (access) + refresh token strategy  
**Base path:** `/api/v1`  
**Validation:** class-validator DTOs on all mutating endpoints  

All write operations that affect transactions, documents, AI, payments, or submission MUST emit an `AuditLog` entry.

---

## 1. Module → Endpoint Map

| Module | Prefix | Notes |
|--------|--------|-------|
| auth | `/auth` | Public login/register; refresh |
| users | `/users` | Profile & preferences |
| roles | `/roles` | Admin |
| services | `/services` | Catalog |
| requirements | `/services/:id/requirements` | Nested under services |
| intent | `/intent` | NL understanding |
| transactions | `/transactions` | Core lifecycle |
| documents | `/documents` | Upload + metadata |
| document-analysis | `/documents/:id/analysis` | Trigger / fetch analysis |
| readiness | `/transactions/:id/readiness` | Computed score |
| workflow | `/transactions/:id/workflow` | Sandbox transitions |
| payments | `/transactions/:id/payment` | Sandbox payment review |
| notifications | `/notifications` | In-app alerts |
| audit | `/audit` | Admin read |
| copilot | `/copilot` | Contextual assistant |
| ai | `/ai` | Orchestrated agent runs (internal-ish) |

---

## 2. Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Create user (role USER) |
| POST | `/auth/login` | Public | Issue access + refresh |
| POST | `/auth/refresh` | Refresh | Rotate tokens |
| POST | `/auth/logout` | JWT | Invalidate refresh (if stored) |
| GET | `/auth/me` | JWT | Current user + roles |

**Rate limit:** stricter on login/register.

---

## 3. Users & Roles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | JWT | Profile |
| PATCH | `/users/me` | JWT | Update name, locale |
| GET | `/roles` | Admin | List roles |
| POST | `/roles/:id/permissions` | Admin | Assign permissions |

---

## 4. Services & Requirements

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/services` | Demo/JWT | List services (`category`, `search`, `active`) |
| GET | `/services/:id` | Demo/JWT | Detail by UUID or code |
| GET | `/services/:id/requirements` | Demo/JWT | Requirement checklist |
| GET | `/transactions/:id/requirements` | Demo/JWT | Requirements in transaction context |

**Phase 2 auth:** `X-Demo-User-Email` header (default seeded demo user). JWT replaces this later.

**Seeded codes:** `TRADE_LICENSE_RENEWAL`, `EMIRATES_ID_UPDATE`, `COMMERCIAL_PERMIT`

### Readiness (Phase 2)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/transactions/:id/readiness` | Compute + persist deterministic readiness |

Response includes `score`, `status`, `breakdown`, `issues`, `missingRequirements`, `recommendations`, `evaluations`, `weights`.

### Documents (Phase 2)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/documents` | List (optional `transactionId`) |
| GET | `/documents/:id` | Metadata |
| POST | `/documents` | Multipart upload (`file`, `transactionId`, optional `documentType`) |
| DELETE | `/documents/:id` | Delete metadata + local object |

---

## 5. Intent (Phase 3)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/intent/status` | Public | Module health |
| POST | `/intent/analyze` | Demo/JWT | NL → structured intent + catalog-backed service match |

**Request**

```json
{
  "message": "I want to renew my trade license"
}
```

**Response (shape)**

```json
{
  "intent": "SERVICE_REQUEST",
  "interpretedRequest": "Trade License Renewal renewal request",
  "serviceCandidate": {
    "id": "...",
    "code": "TRADE_LICENSE_RENEWAL",
    "nameEn": "Trade License Renewal",
    "nameAr": "...",
    "category": "BUSINESS",
    "description": "..."
  },
  "confidence": 0.96,
  "confidenceBand": "HIGH",
  "entities": {
    "companyName": null,
    "licenseNumber": null,
    "expiryDate": null,
    "personName": null
  },
  "alternatives": [],
  "suggestedNextAction": "START_TRANSACTION",
  "provider": "MOCK"
}
```

Confidence bands (single config): `HIGH >= 0.85`, `MEDIUM >= 0.60`, else `LOW`.  
Low confidence does **not** auto-create a transaction — UI asks the user to choose.

Does **not** return chain-of-thought.

---

## 6. Transactions (Phase 3)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/transactions` | Demo/JWT | List mine (filters: status, service, search) |
| POST | `/transactions` | Demo/JWT | Create (`serviceId` required; optional `intentText`, `confidence`) |
| GET | `/transactions/:id` | Demo/JWT* | Detail by UUID or reference code |
| GET | `/transactions/:id/workspace` | Demo/JWT* | Workspace aggregate + next action |
| POST | `/transactions/:id/prepare` | Demo/JWT* | Idempotent preparation + readiness refresh |
| PATCH | `/transactions/:id/fields` | Demo/JWT* | Upsert allowed field values only |
| GET | `/transactions/:id/steps` | Demo/JWT* | Workflow steps |
| GET | `/transactions/:id/fields` | Demo/JWT* | Field list |
| GET | `/transactions/:id/documents` | Demo/JWT* | Documents for transaction |
| GET | `/transactions/:id/readiness` | Demo/JWT* | Deterministic readiness |
| GET | `/transactions/:id/review` | Demo/JWT* | Final review aggregate + eligibility |
| POST | `/transactions/:id/review/confirm` | Demo/JWT* | Confirm sandbox review (`{ "confirmed": true }`) |
| GET | `/transactions/:id/payment` | Demo/JWT* | Sandbox payment quote + status |
| POST | `/transactions/:id/payment` | Demo/JWT* | Create/refresh payment (server-calculated amounts) |
| POST | `/transactions/:id/payment/process` | Demo/JWT* | `{ "outcome": "SUCCESS" \| "FAILURE" }` — never random |
| POST | `/transactions/:id/submit` | Demo/JWT* | Sandbox submission (gated) |
| GET | `/transactions/:id/monitor` | Demo/JWT* | Timeline + activity + payment/submission |
| POST | `/transactions/:id/sandbox/advance` | Demo/JWT* | Advance one sandbox status (demo only) |
| POST | `/transactions/:id/sandbox/reset` | Demo/JWT* | Reset payment/submission for demo replay |

\* Owner-scoped unless Admin. New references are unique (never reuse `TRX-9824-A71`).

### Final review (`GET /transactions/:id/review`)

Returns readiness (via ReadinessService), checklist, eligibility (`READY_FOR_REVIEW` | `NOT_READY` | `BLOCKED`), applicant, fields, documents, warnings/blockers.  
`canProceedToPayment` is **backend-computed** — frontend cannot bypass.

### Payment failure demo

```http
POST /api/transactions/:id/payment/process
{ "outcome": "FAILURE" }
```

Use `"SUCCESS"` (default) for happy path. Documented on `GET /api/payments/status`.

### Submission

Requires: review confirmed, eligibility not BLOCKED/NOT_READY, payment `SANDBOX_PAID` when fees > 0.  
Returns `SUB-YYYY-XXXXXX` submission reference. Labeled **Sandbox Submission**.

### State machine (sandbox)

`PREPARING → READY_FOR_REVIEW → PAYMENT_PENDING → SUBMITTED → PROCESSING → COMPLETED`  
Invalid transitions return `400`. Central map: `transaction-state-machine.ts`.

### Demo reset

`POST /transactions/:id/sandbox/reset` clears payments/submission/review confirmation and returns status to `PREPARING` (sandbox only).

### Workspace payload (`GET /transactions/:id/workspace`)

Includes: service, status, readiness, fields (with `source` + derived `status`), documents, steps, insights, missing/completed requirements, warnings, deterministic `nextAction`, `enabledActions`.

---

## 7. Readiness

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/transactions/:id/readiness` | JWT* | Compute or return cached score + breakdown |
| POST | `/transactions/:id/readiness/recalculate` | JWT* | Force recalculation |

Score is **never** accepted from the client.

---

## 8. Documents

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/documents` | JWT | Multipart upload (`transactionId` optional) |
| GET | `/documents` | JWT | List mine |
| GET | `/documents/:id` | JWT* | Metadata |
| GET | `/documents/:id/download` | JWT* | Stream file (authz checked) |
| DELETE | `/documents/:id` | JWT* | Delete |
| POST | `/documents/:id/attach` | JWT* | Attach to transaction |

**Constraints:** mime allow-list, max size, virus-scan hook placeholder.

---

## 9. Document Analysis

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/documents/:id/analyze` | Demo/JWT* | Trigger mock AI analysis (sync in Phase 3) |
| GET | `/documents/:id/analysis` | Demo/JWT* | Latest analysis (no filesystem paths) |
| GET | `/documents/:id/analysis/history` | — | Phase 4+ |

Analysis statuses: `PENDING` | `PROCESSING` | `COMPLETED` | `FAILED` | `MOCK`.  
Terminology in responses: Demo Validation / AI Check (not legal verification).


**Response includes:** classifiedType, extractedMeta, qualityScore, validationScore, issues[], summary (user-facing).

---

## 10. Workflow (Sandbox)

Prefer transaction lifecycle endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/transactions/:id/monitor` | Timeline + status |
| POST | `/transactions/:id/sandbox/advance` | One-step demo advance |
| POST | `/transactions/:id/sandbox/reset` | Demo reset |

---

## 11. Payments (Sandbox)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/payments/status` | Provider status + FAILURE mode docs |
| GET | `/transactions/:id/payment` | Quote + payment record |
| POST | `/transactions/:id/payment` | Create payment (server amounts) |
| POST | `/transactions/:id/payment/process` | Process with explicit SUCCESS/FAILURE |

Amounts are calculated from `Service.metadata.baseFeeAed` + `additionalFeeAed`. Client amounts are ignored.

---

## 12. Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List for current demo user |
| PATCH | `/notifications/:id/read` | Mark read |

Typical happy path advances:

`READY_FOR_REVIEW` → `PAYMENT_PENDING` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` → `ISSUED`

---

## 11. Payments (Sandbox)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/transactions/:id/payment` | JWT* | Fee summary |
| POST | `/transactions/:id/payment/quote` | JWT* | Generate/refresh quote |
| POST | `/transactions/:id/payment/review` | JWT* | Mark payment reviewed (audit) |
| POST | `/transactions/:id/payment/sandbox-pay` | JWT* | Simulate payment success |

**Example quote**

```json
{
  "currency": "AED",
  "serviceFee": 2500.00,
  "additionalFee": 150.00,
  "totalAmount": 2650.00,
  "feeBreakdown": [
    { "label": "Service Fee", "amount": 2500.00 },
    { "label": "Knowledge Dirham (sandbox)", "amount": 150.00 }
  ],
  "sandbox": true,
  "disclaimer": "Demo payment only. No real government payment is processed."
}
```

---

## 12. Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | JWT | List (unread first) |
| PATCH | `/notifications/:id/read` | JWT | Mark read |
| POST | `/notifications/read-all` | JWT | Mark all read |

---

## 13. Copilot (Phase 5)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/copilot/status` | Public | Module status |
| POST | `/copilot/sessions` | Demo/JWT | Create (`transactionId` optional) |
| GET | `/copilot/sessions` | Demo/JWT | List mine |
| GET | `/copilot/sessions/:id` | Demo/JWT* | Session + messages + transaction summary |
| POST | `/copilot/sessions/:id/messages` | Demo/JWT* | Send message → explainable reply |

\* Session owner only.

**Reply shape:** `answer`, `confidence`, `confidenceBand`, `sources[]`, `suggestedActions[]`, `queryClass`, `provider`.  
Copilot never mutates payment/status/readiness. Suggested actions are links only.

**RAG:** Demo Knowledge Retrieval from `apps/api/knowledge/demo-knowledge.json` (keyword ranking, not embeddings).

**Context injection (server-side):** active transaction status, readiness breakdown, missing docs, payment summary, latest alerts. Client may hint `transactionId`; server re-loads authoritative state.

Supported intents (examples): missing items, pending reason, document readiness, next steps, payment summary, explain warning, prepare application.

---

## 14. AI Orchestration

Most AI runs are triggered by domain endpoints (`/intent/analyze`, `/prepare`, `/final-review`, document analysis). Optional explicit endpoints for demos/admin:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/run` | JWT* | Run named agent graph with transaction context |
| GET | `/ai/actions` | JWT* / Admin | List AIAction history for transaction |

---

## 15. Audit

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit` | Admin | Filter by action, entity, actor, date |

Never return document contents in audit metadata.

---

## 16. Error Contract

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "licenseNumber is required",
  "details": [{ "field": "licenseNumber", "code": "required" }],
  "traceId": "..."
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `AI_UNAVAILABLE`, `SANDBOX_ONLY`.

---

## 17. Frontend Feature → API Binding

| UI Feature | Primary APIs |
|------------|--------------|
| Dashboard | `GET /transactions`, readiness snippets, notifications |
| Intent Search | `POST /intent/analyze` |
| Readiness | `GET /transactions/:id/readiness`, documents |
| Workspace | `GET/PATCH /transactions/:id`, fields, prepare |
| Final Review | `POST /transactions/:id/final-review` |
| Payment | `/payment/*` |
| Monitoring | `/workflow`, notifications |
| Copilot | `/copilot/*` |
| History | `GET /transactions?status=...` |
| Settings | `PATCH /users/me`, logout |

---

## 18. Non-goals for v1 API

- Real government payment gateways  
- Real UAE identity federation  
- Public unauthenticated transaction APIs  
- Streaming CoT / raw model dumps to clients  

Streaming assistant tokens for Copilot may be added later via SSE; initial v1 can return complete messages.
