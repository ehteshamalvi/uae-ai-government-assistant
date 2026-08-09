# GovFlow AI — Council Demo Guide

Professional briefing for evaluators. **Sandbox only** — no real government systems or payments.

## 1. Project overview

**GovFlow AI** is an AI-powered Government Transaction Intelligence & Automation platform demonstration. It shows how AI can assist users through digital transaction workflows while deterministic backend services enforce readiness, payments, and state transitions.

## 2. Problem

Residents and businesses struggle to understand requirements, prepare documents, and track digital government-style transactions. Pure chatbots invent answers; pure portals lack guidance.

## 3. Solution

GovFlow separates concerns:

| Layer | Role |
|-------|------|
| **AI** | Understand intent, retrieve demo knowledge, explain, recommend next actions |
| **Deterministic backend** | Readiness scoring, ownership, payment, submission, state machine |
| **User** | Confirms critical actions (review, pay, submit) |
| **Workflow** | Executes approved sandbox steps |

## 4. AI capabilities

- Intent analysis → service identification (mock provider)
- Context-aware Copilot with demo knowledge retrieval (keyword RAG, not embeddings)
- Document analysis labels (mock OCR)
- Guardrails against claiming real government affiliation or submission
- `AI_PROVIDER=mock` by default — **OpenAI not required**

## 5. Digital transaction capabilities

Intent → Service → Transaction → Preparation → Documents → Readiness → Review → Sandbox Payment → Sandbox Submission → Monitoring → Completed

Seeded demo transaction: `TRX-9824-A71`

## 6. Architecture

Modular monolith: React SPA + NestJS API + Prisma/PostgreSQL + Redis (optional memory fallback).

See `docs/ARCHITECTURE.md` and `docs/AI-ARCHITECTURE.md`.

## 7. Demo flow

1. Open `/demo` → **Start Council Demo**
2. AI Intent on `/search`
3. Open seeded transaction workspace
4. Check readiness; **Explain with AI**
5. Final review (backend eligibility)
6. Sandbox payment (no card/CVV)
7. Sandbox submit
8. Monitor → **Sandbox Advance** (DEMO_MODE only)
9. Complete → **Reset Demo** for the next reviewer

## 8. AI vs deterministic logic

UI labels:

- **AI INSIGHT** — recommendations / explanations
- **DETERMINISTIC CHECK** — readiness, eligibility, ownership
- **SANDBOX ACTION** — simulated payment / submit / advance

## 9. Security

CORS allowlist, Helmet headers, rate limits, validation, request IDs, ownership checks, demo controls gated. See `docs/SECURITY.md`.

## 10. Sandbox limitations

- No real government APIs or authentication
- No real payments or OCR
- No WhatsApp/SMS/email
- No production OpenAI requirement
- No LangGraph / autonomous agents

## 11. Technology stack

React 19, Vite, Tailwind, TanStack Query, Zustand · NestJS 11, Prisma 6, PostgreSQL, Redis · Jest, ESLint, GitHub Actions, Docker Compose (Postgres + Redis)

## 12. Future roadmap (Phase 7+)

Real OpenAI, government integrations, UAE Pass, payment gateway, OCR, vector DB, production orchestration — **out of scope for Phase 6**.

---

**Credentials (seed):** `khalid.demo@govflow.ai` / `DemoPass123!`
