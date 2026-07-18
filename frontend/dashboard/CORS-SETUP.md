# Connecting the dashboard to the backend — setup checklist

## 1. Backend: allow the dashboard's origin (CORS)
Your `.env` has:
```
CORS_ORIGINS=*
```
`*` works for local dev but browsers reject `*` combined with credentials in
some setups. For local dev with the dashboard on `http://localhost:3000`:
```
CORS_ORIGINS=http://localhost:3000
```
For multiple environments (comma-separated per the README):
```
CORS_ORIGINS=http://localhost:3000,https://dashboard.yourdomain.com
```

## 2. Start the backend
```bash
docker compose up -d --build
docker exec -it rag-postgres psql -U postgres -d ragdb -c "CREATE EXTENSION IF NOT EXISTS vector;"
docker compose exec backend alembic upgrade head
docker compose exec backend python -m scripts.seed_local
```
Verify: `curl http://localhost:8000/health`

## 3. Start the dashboard (separately, NOT in the same compose file)
```bash
npm install
npm run dev          # uses .env.development -> http://localhost:8000
```
The dashboard is a separate Next.js dev server on port 3000; it is not part
of `docker-compose.yml` above. If you want it containerized too, say so and
I'll add a `frontend` service to that compose file.

## 4. Get a token and use the app
Open `http://localhost:3000/login`, enter any email (e.g. `dev@local.test`) —
this calls `POST /api/v1/auth/dev-token` on the backend, which only works
when the backend's `ENV=local`. Chat, Ingestion, and Analytics screens then
talk to the real backend. Users and Roles stay on mock data (backend has no
endpoints for those — see the note in `src/services/users.service.ts`).

## 5. If requests fail
- Browser console shows a CORS error → fix step 1, restart backend.
- 401 on every request → token missing/expired; sign out and back in.
- 404 on ingestion/analytics/chat → confirm `NEXT_PUBLIC_API_BASE_URL` in
  `.env.development` matches where the backend is actually running.
- 429 → you hit `RATE_LIMIT_PER_MINUTE` (default 20/min); wait a minute.
