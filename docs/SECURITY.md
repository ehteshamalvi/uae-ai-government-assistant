# GovFlow AI — Security

GovFlow AI is a **sandbox demonstration**. This document describes application security controls implemented for council-ready evaluation. It does **not** claim compliance certifications (ISO, SOC 2, PCI, etc.).

## Authentication boundary

- Demo authentication uses a trusted demo user header / session pattern for local evaluation.
- Protected routes require an authenticated user context (`DemoAuthGuard`).
- Public endpoints are explicitly marked (`@Public()`), e.g. `GET /api/health`, `GET /api/demo/status`.

## Authorization & ownership

- Transaction, document, payment, and Copilot session access is scoped to the owning user (admins excepted).
- Cross-user access returns HTTP 403.

## Input validation

- NestJS `ValidationPipe` with `whitelist`, `transform`, and `forbidNonWhitelisted`.
- DTOs validate strings, enums, UUIDs, booleans, pagination/filters, and Copilot message length (max 2000).

## Rate limiting

- Global throttling via `@nestjs/throttler` (default ~120 req/min, configurable).
- Stricter limits on Copilot, Intent, Documents, and Transactions controllers.
- Excess requests return HTTP 429 (`RATE_LIMITED`).

Environment:

| Variable | Default | Purpose |
|----------|---------|---------|
| `THROTTLE_TTL_MS` | `60000` | Window |
| `THROTTLE_LIMIT` | `120` | Default limit |
| `THROTTLE_COPILOT_LIMIT` | `30` | Copilot controller |
| `THROTTLE_INTENT_LIMIT` | `40` | Intent controller |

## CORS

- Allowed origins from `WEB_ORIGIN` (comma-separated supported).
- Credentials enabled; **never** `origin: "*"` with credentials.
- Production requires an explicit `WEB_ORIGIN` or bootstrap fails.

## Security headers

- Helmet middleware on the API (CSP disabled for JSON API; CORP set to `cross-origin` for SPA clients).
- Response header `X-Request-Id` on every request.

## Request correlation IDs

- Client may send `X-Request-Id` (`[A-Za-z0-9_-]{8,64}`); invalid values are rejected.
- Otherwise a UUID is generated.
- Included in error JSON as `requestId` and in structured HTTP logs.

## Error responses

Safe shape:

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "errorCode": "VALIDATION_ERROR",
  "message": "…",
  "requestId": "…"
}
```

Not exposed: stack traces, Prisma internals, filesystem paths, env vars, DB URLs, secrets.

## Audit logging

- Sensitive workflow events (payment, submission, sandbox advance/reset) are audited.
- HTTP logs include `requestId`, method/path, duration — not passwords, tokens, document contents, or full Copilot context.

## Secret management

- Secrets live in environment variables (see `.env.example`).
- Repository must not contain `.env`, API keys, or credentials (enforced via `.gitignore`).

## Sandbox restrictions

- When `NODE_ENV=production`, `DEMO_MODE` defaults to false.
- Sandbox Advance and Demo Reset require `DEMO_MODE=true` and are forbidden in production.
- Payments and submissions are sandbox-only simulation providers.

## AI guardrails

- Copilot must not claim real government submission, payment, affiliation, or legal advice.
- Suggested frontend actions are allowlisted (no arbitrary URLs; no payment/submit/delete execution by AI).
- Message, history, knowledge chunk, and answer length limits apply.
- Unknown / low-relevance queries refuse invented answers.

## Recommended next hardening (future)

- Real identity (e.g. UAE Pass) — Phase 7+
- Production JWT/session hardening
- WAF / API gateway in front of Nest
- Penetration testing before any production claim

## Publishing to a public GitHub repository

Before the first public push:

1. Ensure a git repository exists (`git init` if needed).
2. Confirm `.gitignore` excludes `.env`, `storage/`, `.data/`, `dist/`, `node_modules/`, keys, logs.
3. Never commit `apps/api/.env` or any file containing real API keys.
4. Review `git status` / staged files before the initial commit.
5. Keep Docker Compose local credentials (`govflow`/`govflow`) for **local demo only** — change them for any shared environment.
6. Demo login `khalid.demo@govflow.ai` / `DemoPass123!` is an **intentional public sandbox account** — not a personal credential.
7. Do not claim government affiliation, real payments, UAE Pass, or production OpenAI in the README.

See also: `docs/COUNCIL-DEMO.md`, `README.md`.
