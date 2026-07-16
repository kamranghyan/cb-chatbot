# GenAI Dashboard (Next.js 15)

Enterprise-architecture rebuild of the GenAI chatbot dashboard.

## Run it
```bash
npm install
npm run dev:mock   # full app on mock data — no backend needed (any login works)
npm run dev        # against the real backend URL in .env.development
npm run build      # production build (type-checked)
```

## Screens included (mock-complete, full CRUD where relevant)
- **Login** — mock mode accepts any email/password
- **Chat** — send message, streamed-style reply
- **Users** — list, invite, edit, remove, role dropdown
- **Roles** — list, add, edit, delete, permissions picker
- **Content** — list, add (document upload / website with verify / video), sync to knowledge base, delete
- **Analytics** — stat cards + 7-day conversation chart
- 404 page, dashboard error boundary, global error boundary

## The one-line promise
When the backend is ready: set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_USE_MOCK_API=false` in `.env.*`. Nothing else changes.

Read `ARCHITECTURE.md` (how and why) and `API-REPLACEMENT-GUIDE.md` (mock→real, new endpoints, new modules, new dashboards).
