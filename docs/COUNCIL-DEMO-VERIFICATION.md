# Council Demo end-to-end verification (manual)

Run with API + web up, `DEMO_MODE=true`, `AI_PROVIDER=mock`.

1. Open `/demo` — SANDBOX DEMONSTRATION visible; Start Council Demo
2. `/search` — AI Intent → service identification
3. Open `TRX-9824-A71` workspace (or create via intent)
4. `/transactions/TRX-9824-A71/readiness` — scores from ReadinessService; Explain with AI
5. Copilot explains readiness; unknown query refuses invented KB dump
6. Final review — eligibility from backend; confirm
7. Sandbox payment — no card fields; Pay in Sandbox; disclaimer
8. Submit — sandbox submission reference only
9. Monitor — timeline from DB; Sandbox Advance → PROCESSING → COMPLETED
10. Reset Demo — returns PREPARING; payment/submission cleared
11. Notifications / History / Settings (EN + AR RTL)
12. `GET /api/health` — api/db/redis/ai/environment (no secrets)
13. Unauthorized / ownership denial; throttling returns 429 under abuse
14. Confirm: no real payment gateway or government API calls

Automated unit coverage: demo mode gates, allowlist, unknown Copilot, request IDs, state machine, readiness, payments (see `apps/api` `*.spec.ts`).
