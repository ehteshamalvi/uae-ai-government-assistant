# GovFlow AI

AI-powered Digital Transaction Intelligence — a **sandbox demonstration** of AI-assisted digital government transaction workflows with an AI Transaction Copilot.

> **SANDBOX DEMONSTRATION** — This platform does **not** connect to real government systems and does **not** process real payments. It is **not affiliated** with TAMM, DubaiNow, or any UAE government entity.

## Current phase

**Phase 6 — Council-ready hardening, Demo Mode, security, CI/CD & UX polish**

Default AI: `AI_PROVIDER=mock` (OpenAI optional, never required).

## Architecture (summary)

```
AI recommends → Deterministic services enforce → User confirms → Workflow executes
```

| App | Stack |
|-----|--------|
| `apps/web` | React + Vite + TypeScript + Tailwind + TanStack Query + Zustand |
| `apps/api` | NestJS + Prisma + PostgreSQL + Redis abstraction |

Docs: `docs/ARCHITECTURE.md` · `docs/AI-ARCHITECTURE.md` · `docs/SECURITY.md` · `docs/COUNCIL-DEMO.md` · `docs/API.md` · `docs/DATABASE.md`

## Demo Mode

Set `DEMO_MODE=true` (default in non-production).

- Landing: `/demo` — Council Demo entry, progress indicator, Reset Demo
- Seeded transaction: `TRX-9824-A71`
- Sandbox Advance / Reset only when demo controls are enabled (disabled in production)

## Local setup

### Prerequisites

- Node.js 20+, npm 10+
- Docker Desktop **or** embedded Postgres (`npm run db:embedded`)
- Redis optional (API memory fallback)

### Install & env

```bash
npm install
cp .env.example apps/api/.env
```

Key variables: `DATABASE_URL`, `REDIS_URL`, `WEB_ORIGIN`, `AI_PROVIDER`, `DEMO_MODE`, `PORT`, `NODE_ENV`

### Database

```bash
npm run docker:up          # optional: postgres + redis
# OR: npm run db:embedded  # keep running

npm run db:generate
npm run db:migrate
npm run db:seed
```

### Run

```bash
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/api  
- Health: http://localhost:3001/api/health  
- Demo: http://localhost:5173/demo  

Demo user: `khalid.demo@govflow.ai` / `DemoPass123!`

## Testing & quality

```bash
npm run db:generate
npm run lint
npm test -w apps/api
npm run build -w apps/api
npm run build -w apps/web
```

CI (`.github/workflows/ci.yml`): install → Prisma generate → lint → API tests → API/web builds. No OpenAI key, Docker runtime, or government APIs required.

## Docker

`docker-compose.yml` provides **postgres** and **redis** only. Local development does not require Docker when using embedded Postgres + Redis fallback.

## Security notes

- Helmet headers, CORS via `WEB_ORIGIN`, rate limiting, validation, request IDs
- Production requires `WEB_ORIGIN`; demo sandbox controls off by default
- Details: `docs/SECURITY.md`

## AI provider

```env
AI_PROVIDER=mock
# OPENAI_API_KEY=   # optional skeleton only
```

## Reset demo

From `/demo` or:

`POST /api/transactions/TRX-9824-A71/sandbox/reset` (requires `DEMO_MODE=true`)

## Technology stack

React 19 · Vite · Tailwind 4 · NestJS 11 · Prisma 6 · PostgreSQL · Redis · Jest · GitHub Actions

## Publishing checklist (public GitHub)

1. Initialize git if needed; **do not** commit `.env` or runtime data.
2. Confirm `AI_PROVIDER=mock` and empty `OPENAI_API_KEY` in `.env.example`.
3. Demo credentials in README are sandbox-only and intentional.
4. See `docs/SECURITY.md` → *Publishing to a public GitHub repository*.

## License / status

Demonstration / evaluation build. Not for production government workloads.
