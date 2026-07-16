# API Replacement Guide — from mock to real backend

## Where things are
- Mock backend: `src/core/api/mock/` (adapter + `handlers/` + `fixtures/`)
- Real API config: `src/core/config/env.ts` reads `.env.*`
- Endpoint paths: `src/core/api/endpoints.ts`
- Request functions: `src/services/*.service.ts`

## Switching to the real backend (the few-minutes part)
1. Open `.env.development` / `.env.production`.
2. Set `NEXT_PUBLIC_API_BASE_URL=https://your-real-api.com/api/v1`.
3. Set `NEXT_PUBLIC_USE_MOCK_API=false`.
4. Restart `npm run dev`. Done — no code changes.

If the real backend's paths differ slightly (e.g. `/roles` became `/api/v1/admin/roles`), edit **only** `src/core/api/endpoints.ts`. If a response envelope differs, update the type in `core/api/types.ts` and the one `.then(res => ...)` in the affected hook. UI components never change.

You can delete `src/core/api/mock/` afterwards, or keep it forever for offline dev and tests — it costs nothing when the flag is off.

## Adding a new endpoint (e.g. "export users as CSV")
1. `core/api/endpoints.ts` → add `users.exportCsv: '/users/export'`.
2. `services/users.service.ts` → add `exportUsersCsv()` calling `apiClient.get(ENDPOINTS.users.exportCsv)`.
3. Backend not ready? `core/api/mock/handlers/users.ts` → add `{ route: 'GET /users/export', handler: () => ({ data: '...' }) }`.
4. `features/users/hooks/` → add a `useExportUsers` hook if UI needs it.

## Adding a new module (e.g. "Reports")
1. Add paths to `endpoints.ts` (`reports: {...}`).
2. Create `services/reports.service.ts`.
3. Create `core/api/mock/fixtures/reports.ts` + `handlers/reports.ts`, register in `handlers/index.ts`.
4. Create `features/reports/` with `hooks/` + `components/`.
5. Add `src/app/(dashboard)/admin/reports/page.tsx` and a sidebar entry in `(dashboard)/layout.tsx`.

## Creating another dashboard with this architecture
Copy `src/core/`, `src/components/ui/`, `src/lib/` as-is (they contain zero business logic). Write new `services/`, `features/`, `app/` for the new domain, and point `.env` at the new backend. If several dashboards share the core, extract `core/` + `components/ui/` into an internal npm package or a monorepo package later.

## Porting screens from the old CRA project
The old app's UI is written on MUI 5.0.0-alpha (React 17) and cannot run on Next.js 15 (React 18+). Port screen-by-screen: pick the old page → identify its API calls → they already exist in `src/services` (same functions, same names) → rebuild the JSX with MUI v6 using `DataTable`/`PageHeader` → wire a Query hook. Roles is the finished reference example of a full CRUD screen.
