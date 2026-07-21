# Real auth flow — what's confirmed vs assumed

## Correction from the previous pass
The Register/Login/Chat flow was accidentally built into the Next.js admin
dashboard first — wrong project. This pass implements it in **this React
(Vite) chatbot project** instead, where it belongs. The Next.js dashboard
is untouched by this change.

## New flow
```
App loads → useAuth checks localStorage
  valid session?  → ChatScreen  (wraps the existing <ChatWidget/>, untouched)
  no session?     → RegisterScreen (default — first screen a new visitor sees)
                       ↓ successful signup
                     LoginScreen
                       ↓ successful login (stores access + refresh token)
                     ChatScreen
```
No router library was added (`react-router-dom` etc.) — this project had
zero routing dependencies (`react`/`react-dom` only), so a simple
state-based screen switch in `App.tsx` keeps the bundle lean, matching the
widget's existing minimal-dependency philosophy. If you'd rather have real
URLs (`/register`, `/login`, shareable/refreshable), say so and I'll add
`react-router-dom`.

## What was provided
Only Pydantic **schemas** — no router file:
```python
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str
    client_type: Literal["main", "guest"] = "main"

class RefreshIn(BaseModel):
    refresh_token: str
    client_type: Literal["main", "guest"] = "main"

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_in: int
    token_type: str = "bearer"
```

## ⚠️ Assumptions made — confirm these

1. **Same backend** as the RAG Chatbot Backend v2 (`/api/v1`), not a
   separate auth service.
2. **Endpoint paths**: `POST /api/v1/auth/signup`, `/auth/login`,
   `/auth/refresh` — guessed from the schema class names, following this
   backend's existing `XxxIn → /auth/xxx` convention (`DevTokenIn` was
   `/auth/dev-token`). **Not confirmed — only place to fix:
   `src/core/auth/authApi.ts`.**
3. **No logout endpoint** — logout only clears the local session. If the
   backend has `POST /auth/logout` (e.g. to revoke the refresh token
   server-side), add the call in `src/core/auth/useAuth.ts` → `logout()`.
4. **The JWT this issues is accepted by `POST /chat`** (same `RequireUser`
   auth as before). If signup/login issues a different kind of token (e.g.
   a raw Cognito ID token needing separate backend-side validation), chat
   requests will 401 even though login succeeded.
5. **Error response shape** — `src/core/auth/apiError.ts` defensively
   checks FastAPI's `{"detail": ...}` *and* generic `{"message": ...}` /
   `{"error": ...}` (Cognito-style) shapes, since the exact format wasn't
   confirmed.

## To lock these down exactly, share:
```powershell
docker compose exec backend cat src/api/v1/auth.py     # or wherever the router lives
docker compose exec backend grep -rn "auth" src/main.py src/app.py
```
Once confirmed, only `src/core/auth/authApi.ts` needs its 3 path strings
updated — same "one file to fix" pattern as the rest of this integration.

## Files added/changed

| File | What |
|---|---|
| `src/core/auth/types.ts` | Signup/Login/Refresh/Token types (exact schema match) |
| `src/core/auth/session.ts` | localStorage session (access + refresh token + expiry) |
| `src/core/auth/apiError.ts` | Extracts a readable message from any error shape |
| `src/core/auth/authApi.ts` | `signup()`, `login()`, `refresh()` — plain `fetch`, no new dependency |
| `src/core/auth/useAuth.ts` | React state + **proactive token refresh** ~60s before expiry (keeps long chat sessions alive without a 401) |
| `src/screens/RegisterScreen.tsx` | Email/password/confirm, client-side validation, real signup |
| `src/screens/LoginScreen.tsx` | Real login, real error display |
| `src/screens/ChatScreen.tsx` | Wraps the **existing, untouched** `<ChatWidget/>` with the authenticated user's token in the `http` transport header |
| `src/App.tsx` | Rewritten as the real app shell (was a transport-switcher dev playground before) |
| `.env.example` | Simplified — only `VITE_API_BASE_URL` now (no manual token needed) |
| `tsconfig.json` | Removed an unused `baseUrl`/`paths` block (pre-existing, unrelated — was blocking `tsc` on newer TypeScript) |

`ChatWidget.tsx`, all transports, `MessageBubble`, `Header`, etc. are
**completely unchanged** — this pass only added what sits in front of them.

## Testing locally
```bash
cp .env.example .env.local     # set VITE_API_BASE_URL if not localhost:8000
npm install
npm run dev
```
Visit the printed URL — you should land on Register. Create an account →
redirected to Login → sign in → Chat screen with the widget in the
bottom-right corner, now talking to the real backend as you.

---

## Update: real URL routing + instant post-login redirect

Two issues were reported and fixed:

### 1. URL stayed at `/` instead of `/chat`
There was no routing library before — screens switched via internal React
state, so the browser address bar never changed. Added `react-router-dom`
(demo app only — confirmed the published widget bundle size is unchanged,
`52.57 kB`, so this adds **zero weight** to the actual library):
```
/register  ->  RegisterScreen
/login     ->  LoginScreen
/chat      ->  ChatScreen (protected)
/  and *   ->  redirects to /chat or /register based on session
```
`LoginScreen` now calls `navigate('/chat', { replace: true })` the instant
the token is persisted — nothing else is awaited first.

### 2. Perceived delay after login
Root cause: `useAuth()` was a **plain hook**, not shared state. Every
screen mounted its *own independent instance*, each re-running the
"read localStorage, resolve session" boot phase from scratch. So
navigating Login -> `/chat` mounted a brand-new `useAuth()` inside
`ChatScreen` that briefly showed `status: 'checking'` again before
flipping to `'authenticated'` — a visible flash/delay that had nothing to
do with the network.

Fixed by converting it to `AuthContext` (`src/core/auth/AuthContext.tsx`),
mounted **once** at the app root (`<AuthProvider>` wraps the router). Every
screen now reads the same already-resolved state — no re-checking, no
flash, instant transition.

The remaining time between clicking "Sign in" and the button re-enabling
is the real `/api/v1/auth/login` network round trip to Cognito — that's
genuine network latency, not app overhead, and the button shows
"Signing in…" for immediate feedback during it. `/chat` itself renders
with zero additional waiting: `ChatScreen` doesn't fetch any chat history
before showing the widget — the widget loads/streams its own data lazily
once open, per the "page must show immediately" requirement.

### Deployment note
`BrowserRouter` needs the host server to fall back to `index.html` for
unknown paths (so a hard refresh on `/chat` doesn't 404) — Vite's dev
server does this automatically; for a static production host (S3+CloudFront,
Nginx, etc.) add an SPA fallback rule. Say so if you want this documented
per-platform.

---

## Update: auth embedded INSIDE the widget (no separate routes/pages)

Reverted the previous routing approach entirely per feedback — Signup and
Login are no longer separate pages/routes. `react-router-dom` was removed.

### New structure
```
components/
  ChatWidget.tsx              <- UNCHANGED. Plain, auth-agnostic widget for
                                 any host that manages its own auth
                                 externally (as originally designed).
  AuthenticatedChatWidget.tsx <- NEW. This app's actual entry point. Owns
                                 the window/launcher/Header (same chrome
                                 as ChatWidget) and swaps its BODY between:
                                   status 'checking'      -> spinner
                                   status 'unauthenticated' -> <AuthPanel/>
                                   status 'authenticated'   -> <ChatBody/>
  AuthPanel.tsx               <- NEW. Signup/Login forms styled to fit
                                 inside the widget's own window (reuses the
                                 same --ccw-* CSS variables/theme).
  ChatBody.tsx                <- NEW. Messages + input + typing indicator,
                                 extracted from ChatWidget.tsx so it only
                                 mounts (and only opens a transport) once
                                 authenticated.
```
`App.tsx` now just renders `<AuthProvider><AuthenticatedChatWidget config={...}/></AuthProvider>` — no routes at all.

### Why this satisfies "no reload, same window, seamless"
`AuthenticatedChatWidget` renders ONE persistent `ccw-window` div. Whether
you see the signup form, the login form, or chat messages is a plain
`status === '...'` conditional inside that same div — not a route change,
not a remount of the window/Header/launcher button. When `login()` resolves
and `AuthContext`'s `status` flips to `'authenticated'`, React just
re-renders that one conditional and `<ChatBody/>` mounts in place of
`<AuthPanel/>` — same open/close state, same scroll container, no flicker.

### Bundle hygiene
Auth panel CSS was split into its own file (`AuthPanel.css`), injected
separately from `ChatWidget.css`. The plain, publicly-exported `<ChatWidget/>`
(what `react-chat-widget-kit` ships as a library) is **completely
unaffected** — confirmed identical bundle size before/after (`52.57 kB`).
Only `AuthenticatedChatWidget`'s tree (this app) pays for the auth CSS.

### Default view
A user opening the widget for the first time sees **Signup** first
(`initialView="signup"` in `AuthPanel`), matching the original required
order (Register before Login) — just embedded now instead of a page.
