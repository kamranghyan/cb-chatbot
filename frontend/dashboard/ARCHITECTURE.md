# Architecture Guide

This document explains how the dashboard is structured, why each folder exists, and how data flows. It assumes you are learning software architecture, so reasoning is spelled out.

## The big picture

The application is built in **layers**. Each layer only talks to the layer directly below it, and never reaches around it:

```
UI (app/ routes + features/*/components)
        ↓ calls
Hooks (features/*/hooks — TanStack Query)
        ↓ calls
Services (src/services — typed domain functions)
        ↓ calls
API Client (src/core/api/client.ts — the ONLY axios instance)
        ↓ sends through ONE of:
   ┌────────────────────┬─────────────────────────┐
   │ Real network       │ Mock adapter            │
   │ (ENV.API_BASE_URL) │ (src/core/api/mock)     │
   └────────────────────┴─────────────────────────┘
```

The mock/real switch sits **below every layer the UI can see**. That is the entire trick: components, hooks, and services execute identical code in both modes, so swapping in the real backend cannot break the UI.

## Folder-by-folder

### `src/core/` — the foundation (application-agnostic)
Code here knows nothing about users, roles, or chat. It could be copied into any other dashboard unchanged.

- `core/config/env.ts` — the ONLY file allowed to read `process.env`. Every environment-specific value (base URL, mock flag, latency) is exported from here. **This was the only file edited when the project moved from CRA to Next.js** — proof the design works.
- `core/api/client.ts` — creates the single axios instance: base URL, interceptors, and the mock/real adapter switch. No other file may call `axios.create` for backend requests.
- `core/api/endpoints.ts` — every backend path in one registry. Rule: no API path string may exist anywhere else. Dynamic segments are functions (`ENDPOINTS.roles.byId('3')`).
- `core/api/interceptors.ts` — attaches auth headers to every request; converts 401/403/412 into a global "session expired" event.
- `core/api/session.ts` — token storage. Swap localStorage for cookies/next-auth here without touching anything above.
- `core/api/types.ts` — shared response shapes (`Paginated<T>`, domain models).
- `core/api/mock/` — the mock backend (see below).

**When to add files here:** only for cross-cutting infrastructure (logging, retry policy, a websocket client). If it mentions a business concept, it does not belong in core.

### `src/core/api/mock/` — the mock backend
- `mockAdapter.ts` — a drop-in replacement for axios' network transport. It parses method/path/query/body, matches against registered routes, waits `MOCK_LATENCY_MS`, and returns real `AxiosResponse` objects (or throws real `AxiosError`s for 4xx/5xx). Because it replaces the transport, request interceptors, auth headers, loading states, and error handling all run exactly as in production.
- `handlers/*.ts` — one file per domain. Each handler returns the same envelope the real backend will return. Handlers mutate in-memory copies of fixtures, so create/update/delete feel real within a session.
- `fixtures/*.ts` — seed data only. No logic.

**Why not static JSON in components?** Static JSON skips the request pipeline: no latency, no loading spinners, no error paths, no auth, and a second code path you must rip out later. The adapter exercises the real pipeline and disappears with one env flag.

### `src/services/` — the domain API (what the app can ask the backend)
One file per backend domain (`roles.service.ts`, `users.service.ts`, …). Each function: takes typed input, builds the URL from `ENDPOINTS` (query strings via `URLSearchParams`, never string concatenation), calls `apiClient`, returns a typed promise.

**When to add files:** new backend domain → new service file. New operation on an existing domain → new function in that file.
**Interacts with:** `core/api` below, `features/*/hooks` above. Services never import React.

### `src/features/` — feature-based modules (the business of the app)
Each feature owns everything specific to it:

```
features/roles/
  hooks/useRoles.ts        ← data fetching + mutations (TanStack Query)
  components/RolesTable.tsx ← UI
```

- `hooks/` wrap services with TanStack Query: caching, deduplication, loading/error state, and cache invalidation after mutations (`useAddRole` invalidates the roles list, so the table refreshes automatically). This replaces the old project's two competing patterns (Redux thunks vs useEffect+useState) with one.
- `components/` are 'use client' components that render feature UI using the shared UI kit.

**When to create a new feature folder:** when a screen or capability has its own backend domain or its own state. Features may import from `components/`, `services/`, `lib/`, `core/` — but **never from another feature**. If two features need the same thing, it moves down into `components/` or `lib/`.

### `src/components/ui/` — the shared UI kit
Application-wide building blocks with zero business knowledge: `DataTable` (generic, declarative columns; handles loading/error/empty once for every list screen), `PageHeader`, `ConfirmDialog`, `LoadingState`, `EmptyState`, `ErrorState`.

**When to add files:** a component is used (or clearly will be used) by two or more features.

### `src/lib/` — app-level glue
`providers.tsx` (theme + query client, mounted once), `theme.ts` (all branding), `queryKeys.ts` (central registry of cache keys so invalidation is consistent and discoverable).

### `src/app/` — routing only (Next.js App Router)
Route files are intentionally thin: they compose a `PageHeader` and a feature component, nothing else. The `(dashboard)` route group provides the sidebar shell + `AuthGuard` to every authenticated screen without affecting URLs. **No data fetching, no business logic in `app/`** — pages must stay boring.

## Data flow example (Roles screen)

1. `/admin/roles/page.tsx` renders `<RolesTable/>`.
2. `RolesTable` calls `useRoles()`.
3. `useRoles` asks TanStack Query for cache key `['roles']`; on a miss it calls `rolesService.listRoles()`.
4. The service calls `apiClient.get(ENDPOINTS.roles.root)`.
5. The request interceptor attaches auth headers.
6. Mock mode: the adapter matches `GET /roles`, waits 400 ms, returns `{count, next, previous, results}`. Real mode: the same request goes to `API_BASE_URL/roles`.
7. The hook caches `results`; the table renders. Add/edit/delete mutations invalidate `['roles']` and the list refetches itself.

## Decisions and why

- **TanStack Query instead of Redux thunks / useEffect fetching** — server data is a cache, not app state. Query gives caching, deduplication, retries, and automatic refetch-after-mutation, deleting the boilerplate every old list page reimplemented.
- **Client-side data fetching (not React Server Components) for data** — this is an auth-walled interactive dashboard with zero SEO need; a single client-side pipeline also keeps the mock/real switch invisible. RSC still renders the static shell.
- **Mock at the axios adapter, not in services** — services with `if (mock)` branches rot and leak. One switch, zero branches.
- **Feature folders, not type folders, for business code** — "everything about roles is in one place" scales better over 2–3 years than giant global `components/` and `hooks/` folders (the old project's `src/components` had 89 mixed files).
