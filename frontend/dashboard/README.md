# Conversation Management Dashboard (Next.js 15)

**This is NOT a chatbot.** There is no message-sending interface. This is an
admin tool to review conversations users already had with the AI: every
question asked, every answer given, which questions the AI could not
answer, reported issues, and their solutions.

## Run it
```bash
npm install
npm run dev:mock   # everything on demo data — no backend needed (any login works)
npm run dev        # against the real backend URL in .env.development
npm run build      # production build (type-checked)
```

## What's real vs demo data
- **Real (backend)**: Ingestion, Analytics, Auth (dev-token). Confirmed
  against the actual `api/v1/` source and `analytics_service.py`.
- **Demo data (mock-only)**: Conversations, Unanswered Questions, Issues,
  Users, Roles — the backend has no cross-user admin endpoint yet.
  See `ADMIN-ENDPOINTS-NEEDED.md` for the exact spec to add it.

## Screens
- **Conversations** — pick a user, see their full history: every question,
  every answer (or "Unanswered"), sources used, user feedback, and any
  reported issue + its solution.
- **Unanswered Questions** — flat list across all users, for finding
  knowledge-base gaps.
- **Issues** — every reported problem, open vs resolved, with solution text.
- **Ingestion** — add documents to the knowledge base (real).
- **Analytics** — usage stats and daily trend (real).

## The one-line promise
When the backend is ready: set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_USE_MOCK_API=false` in `.env.*`. Nothing else changes.

Read `ARCHITECTURE.md` (how and why) and `API-REPLACEMENT-GUIDE.md` (mock→real, new endpoints, new modules, new dashboards).
