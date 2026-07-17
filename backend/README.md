# RAG Chatbot Backend (v2)

A production-grade, multi-tenant RAG (Retrieval-Augmented Generation) chatbot backend — a full modernization of a legacy FastAPI monolith into a modular, provider-swappable architecture.

Built with **FastAPI · SQLAlchemy 2.0 · Pydantic v2 · LangChain 0.3 · pgvector · AWS Bedrock · Redis**.

---

## Highlights

- **Provider-swappable RAG stack** — LLM, embeddings, vector store, chunker, and loaders are independent services behind interfaces. Switching from Bedrock Nova to Ollama (or adding a new model) is a one-line `.env` change; adding a new provider is one new file. No business code changes.
- **Env-first configuration with AWS SSM fallback** — runs fully local with just a `.env` file (no AWS needed); on AWS environments, missing values are fetched from SSM Parameter Store automatically (batched, cached, fail-soft).
- **Three chat transports, one pipeline** — plain HTTP JSON, SSE streaming, and WebSocket all share the same orchestration code.
- **Retrieval-level RBAC** — documents are stamped with `security_level` / `department_id` / `brand_id` at ingestion; retrieval filters by the user's clearance, so restricted content never reaches the LLM context.
- **Hardened** — per-user rate limiting, Redis caching, env-driven CORS, fail-soft integrations, and a unit test suite.

---

## Architecture

Ports & adapters (hexagonal). Each capability is an interface (port) with pluggable providers (adapters), selected via `.env` through a registry pattern.

```
src/
├── main.py                  # uvicorn entrypoint
├── app.py                   # app factory (lifespan: DB engine + Redis)
│
├── config/
│   ├── settings.py          # Pydantic v2 Settings — priority: env > .env > SSM > defaults
│   ├── ssm_source.py        # SSM fallback source (batched, cached, fail-soft)
│   └── ssm_mapping.json     # per-env mapping: setting field -> SSM parameter name
│
├── api/v1/                  # transport layer only (routers + schemas)
│   ├── auth.py              # dev-token (local only)
│   ├── chat.py              # JSON chat, SSE /stream, WebSocket /ws, CRUD, feedback, issue
│   ├── ingestion.py         # text / file / s3 / presigned-url / list (admin)
│   ├── analytics.py         # summary / daily (admin)
│   ├── rag_debug.py         # local-only provider test endpoints
│   └── schemas/             # Pydantic request/response models
│
├── services/                # thin orchestrators (use-cases)
│   ├── rag_chat_service.py  # 7-step chat pipeline (shared by HTTP + streaming)
│   ├── memory_service.py    # history condensation (follow-up -> standalone question)
│   ├── guardrail_service.py # LLM topic classifier (ALLOW/BLOCK)
│   ├── ingestion_service.py # load -> chunk -> stamp -> store
│   ├── analytics_service.py # aggregates + Redis cache
│   └── chat_service.py      # chat CRUD
│
├── rag/                     # core — every piece independent
│   ├── llm/                 # base.py (port) + providers: bedrock, sagemaker, ollama, fake
│   ├── embed/               # base.py + providers: bedrock, ollama, fake
│   ├── vectorstore/         # base.py + providers: pgvector, bedrock_kb
│   ├── chunk/               # base.py + providers: recursive
│   ├── ingest/              # base.py + providers: text, file (txt/md/pdf), s3
│   └── factory.py           # .env -> concrete providers (single selection point)
│
├── infrastructure/
│   ├── db/                  # SQLAlchemy 2.0 models, async session, Alembic
│   ├── cache/redis.py       # fail-open cache + rate-limit counters
│   └── notifications/       # SendGrid email, Salesforce cases (optional, fail-soft)
│
├── prompts/                 # version-controlled templates + registry (optional S3 override, TTL-cached)
├── core/                    # auth (JWT + request-scoped AuthContext), rate limit, exceptions, logging
└── domain/                  # enums (SecurityLevel hierarchy, IngestionStatus, ...)
```

**Registry pattern (the multi-model core):**

```python
@register_llm("ollama")
class OllamaLLMProvider(LLMProvider):
    def get_model(self, model_id, **kwargs): ...
```

`factory.py` reads `LLM_PROVIDER=ollama` from `.env` and resolves the class from the registry. The same pattern applies to embeddings, vector stores, chunkers, and loaders.

---

## Phases

### Phase 0 — Boilerplate & Configuration
- Modular skeleton (api / services / rag / infrastructure / config / core / domain).
- **Settings priority chain**: `OS env > .env > SSM Parameter Store > code defaults`.
- SSM fallback activates only when `ENV != local` (or `SSM_FALLBACK=true`); fetches are batched (10 params/call), cached for process lifetime, and fail-soft (SSM down → warning, app still boots).
- Docker Compose stack: app + `pgvector/pgvector:pg16` + Redis. No credentials baked into images.

### Phase 1 — Database, Auth & Chat CRUD
- SQLAlchemy 2.0 typed models: `Chat`, `Conversation`, `ConversationSource`, `ChatSession`, `User`, `UserSession`, org tables, `IngestionMetadata`. Alembic baseline migration.
- **Request-scoped `AuthContext`** replaces the legacy thread-local context (which could leak user identity across interleaved async requests). JWT verification **plus** an active-session check in `user_sessions` — server-side revocation works, not just token expiry.
- Request-scoped `AsyncSession` dependency (commit on success, rollback on error) replaces the legacy global session.
- RBAC as typed dependencies: `RequireUser`, `RequireAdmin`.

### Phase 2 — RAG Provider Layer
- Interfaces + registries for LLM, embeddings, and vector store.
- Providers: `ChatBedrockConverse` (unified Converse API — Claude/Nova/Llama/Mistral without model-specific branching), SageMaker endpoint, Ollama (local dev), and deterministic **fake providers** for zero-dependency local testing.
- `PGVector` (langchain-postgres, JSONB metadata filters) and Bedrock Knowledge Base adapters. The KB adapter hides the asymmetry: `add_documents` triggers a KB sync job instead of inserting (KB chunks/embeds internally).
- Sync SDK calls wrapped in `asyncio.to_thread` so the event loop never blocks.
- LangSmith tracing wired via env (`LANGSMITH_TRACING=true`).

### Phase 3 — Chat Pipeline
Seven explicit steps in `RagChatService`:
1. **Chat resolve/create** (new chat titled from the question)
2. **Guardrail** — LLM classifier; blocked topics get a canned response and skip retrieval/generation
3. **Memory** — last N conversations condense a follow-up into a standalone question
4. **Retrieve** — vector search with an RBAC `SearchFilter` built from the user's clearance (`SECRET` sees public+private+secret; `PUBLIC` sees public only)
5. **Prompt** — version-controlled template from the prompt registry (optional S3 override with a 5-minute TTL cache)
6. **Generate** — structured LLM response; legacy regex `<answer>`-tag parsing removed entirely
7. **Persist** — `Conversation` + `ConversationSource` rows (scores + metadata)

Memory and guardrail are fail-soft: an LLM hiccup logs a warning and the chat proceeds with the original question.

### Phase 4 — Streaming (SSE + WebSocket)
- Steps 1–5 refactored into a shared `_prepare()`; HTTP and streaming differ only in delivery.
- **Event protocol** (identical on SSE and WS): `meta → token × N → sources → done`.
- Persistence happens only after the stream completes — no partial answers in the DB.
- SSE: POST-based (`fetch` + ReadableStream on the frontend). WS: multi-turn on one connection, token via query param (browsers can't set WS headers), and a fresh DB session per message (long-lived connections must not hold pool sessions).
- Provider-agnostic content normalization (`_extract_text`) handles both plain-string chunks (Claude/Ollama) and Converse content-block lists (Nova).

### Phase 5 — Ingestion Pipeline
- Independent, composable steps: **Load** (text / file [txt, md, pdf] / S3) → **Chunk** (recursive, `MAX_CHUNK_SIZE`/`CHUNK_OVERLAP` from env) → **Stamp** → **Store**.
- The **stamp** step writes `security_level`, `department_id`, `brand_id`, and `source_uid` into every chunk's metadata — this is what makes Phase 3's retrieval-level RBAC real.
- Status tracking in `tenant_ingest_metadata` (`processing → completed/failed`, `chunk_count`, error message).
- Presigned S3 upload flow + `/ingestion/s3` for the AWS path; with `VECTORSTORE_PROVIDER=bedrock_kb` the same endpoints drive KB sync.

### Phase 6 — Hardening & Operations
- **Analytics** (admin): totals, feedback likes/dislikes, avg response time, ingestion status counts, daily trend — cached in Redis (60s TTL).
- **Rate limiting**: per-user, per-minute Redis counter on LLM endpoints (`RATE_LIMIT_PER_MINUTE`, 0 = off). Fail-open by design.
- **Integrations**: SendGrid email + Salesforce case creation on chat issues — optional and fail-soft (empty keys = disabled, never breaks the flow).
- Env-driven CORS allowlist; unit tests (config priority, JWT roundtrip, clearance hierarchy, chunker metadata, provider registry).
- Design principle: availability-critical components **fail-open** (cache, rate limit); security-critical components **fail-closed** (auth).

---

## Request Flows

### Authentication (every protected request)
```
Bearer JWT ── verify signature/expiry ── check active session in user_sessions
           ── build request-scoped AuthContext (user, role, clearance, brand, session)
```

### Chat (HTTP)
```
POST /api/v1/chat ── auth ── rate limit
  1 resolve/create chat        4 retrieve (RBAC filter from clearance)
  2 guardrail (ALLOW/BLOCK)    5 prompt (template + context)
  3 condense follow-up         6 generate
  7 persist conversation + sources
→ {external_chat_id, external_conv_id, answer, sources[]}
```

### Streaming (SSE `/chat/stream` · WS `/chat/ws?token=...`)
```
same steps 1–5, then:
  event: meta {chat_id, title}
  event: token {"text": "..."}   (× N, from llm.astream())
  event: sources [...]
  [persist full answer]
  event: done {conv_id, response_time}
```

### Ingestion
```
POST /ingestion/{text|file|s3} (admin)
  load → chunk → stamp(security_level, department_id, brand_id, source_uid)
       → vectorstore.add_documents → status: completed + chunk_count
```
Ingestion stamps are exactly what chat retrieval filters on — restricted documents never enter a lower-clearance user's LLM context.

---

## Getting Started

### Run locally (no AWS required)

```bash
cp .env.example .env                  # local defaults are complete
docker compose up -d --build          # app + pgvector Postgres + Redis
docker exec -it rag-postgres psql -U postgres -d ragdb -c "CREATE EXTENSION IF NOT EXISTS vector;"
docker compose exec backend alembic upgrade head
docker compose exec backend python -m scripts.seed_local
```

Or bare metal:

```bash
python -m venv .venv && source .venv/bin/activate   # Windows Git Bash: .venv/Scripts/activate
poetry install                                       # or: pip install -r deps from pyproject
docker compose up -d postgres redis
alembic upgrade head
python -m scripts.seed_local
python -m src.main
```

Verify: `http://localhost:8000/health` and `http://localhost:8000/docs`.

For zero-dependency testing, set `LLM_PROVIDER=fake` and `EMBED_PROVIDER=fake` — the full pipeline (pgvector, filters, streaming) runs with deterministic fakes.

### Get a token (local only)

```bash
curl -X POST http://localhost:8000/api/v1/auth/dev-token \
  -H 'Content-Type: application/json' -d '{"email": "dev@local.test"}'
```

### Run on AWS models (Bedrock)

Credentials live in `~/.aws/credentials` (or an IAM role) — never in code or `.env`. Then:

```
LLM_PROVIDER=bedrock
LLM_MODEL_ID=apac.amazon.nova-lite-v1:0        # region-matched inference profile
EMBED_PROVIDER=bedrock
EMBED_MODEL_ID=amazon.titan-embed-text-v2:0
BEDROCK_REGION=ap-south-1
```

Notes: enable model access in the Bedrock console for your region; Nova requires a cross-region inference profile prefix (`us.` / `apac.`); changing embedding models changes vector dimensions — clear `langchain_pg_embedding` before switching.

### Run on AWS environments (SSM)

Set `ENV=dev` (SSM fallback turns on automatically). Values present in env/`.env` win; missing ones are fetched from SSM using `src/config/ssm_mapping.json`. Populate that file with your parameter names per environment.

---

## Configuration Reference (key variables)

| Variable | Default | Purpose |
|---|---|---|
| `ENV` | `local` | `local` / `dev` / `qa` / `stage` / `prod` |
| `SSM_FALLBACK` | auto | force SSM on/off (auto-on when `ENV != local`) |
| `LLM_PROVIDER` / `LLM_MODEL_ID` | `bedrock` / claude | chat model selection |
| `EMBED_PROVIDER` / `EMBED_MODEL_ID` | `bedrock` / cohere | embeddings selection |
| `VECTORSTORE_PROVIDER` | `pgvector` | `pgvector` or `bedrock_kb` |
| `CHUNKER_PROVIDER` | `recursive` | chunking strategy |
| `MAX_CHUNK_SIZE` / `CHUNK_OVERLAP` | 1000 / 200 | chunking parameters |
| `ENABLE_CHAT_MEMORY` / `CHAT_HISTORY_NO_OF_MSGS` | true / 5 | follow-up condensation |
| `ENABLE_GUARDRAILS` | true | topic classifier step |
| `ENABLE_DEPARTMENT_FILTER` | false | enable once all docs are stamped with department |
| `RETRIEVAL_TOP_K` | 4 | chunks per query |
| `RATE_LIMIT_PER_MINUTE` | 20 | per-user LLM endpoint limit (0 = off) |
| `CORS_ORIGINS` | `*` | comma-separated allowlist for prod |
| `LANGSMITH_TRACING` / `LANGSMITH_API_KEY` | off | LangChain tracing |
| `SENDGRID_API_KEY`, `SALESFORCE_*` | empty | optional integrations (empty = disabled) |

---

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/dev-token` | — | test token (local env only) |
| POST | `/api/v1/chat` | user | RAG chat (JSON) |
| POST | `/api/v1/chat/stream` | user | RAG chat (SSE) |
| WS | `/api/v1/chat/ws?token=` | user | RAG chat (WebSocket, multi-turn) |
| GET | `/api/v1/chat/list` | user | user's chats |
| GET | `/api/v1/chat/{chat_id}` | user | chat detail + conversations + sources |
| POST | `/api/v1/chat/feedback/{conv_id}` | user | like/dislike/comment |
| POST | `/api/v1/chat/{chat_id}/issue` | user | file an issue (email + Salesforce, fail-soft) |
| POST | `/api/v1/ingestion/text` | admin | ingest raw text |
| POST | `/api/v1/ingestion/file` | admin | upload txt/md/pdf |
| POST | `/api/v1/ingestion/s3` | admin | ingest from S3 key |
| POST | `/api/v1/ingestion/presigned-url` | admin | S3 upload URL |
| GET | `/api/v1/ingestion/list` | admin | ingestion status tracking |
| GET | `/api/v1/analytics/summary` | admin | totals + feedback (cached 60s) |
| GET | `/api/v1/analytics/daily` | admin | daily conversation trend |
| POST | `/api/v1/rag/*` | — | provider debug endpoints (local env only) |
| GET | `/health` | — | health + active providers |

---

## Testing

```bash
pytest tests/ -v
```

Covers: settings priority chain, JWT encode/decode, security clearance hierarchy, chunker size/metadata behavior, provider registry integrity, and RBAC filter mapping.

Manual verification patterns used throughout the phases:
- RBAC: ingest a `secret` doc → search as `public` clearance → must not appear.
- Rate limit: set `RATE_LIMIT_PER_MINUTE=3` → 4th request within a minute returns 429.
- Cache: two consecutive `/analytics/summary` calls → `cached: false` then `cached: true`.
- Streaming: SSE via `curl -N`; WS via a small Python `websockets` client.

---

## Legacy → v2: What Changed

| Legacy | v2 |
|---|---|
| SSM fetched at import time; no `.env`; local boot required AWS | env > .env > SSM chain; fully offline local dev |
| Thread-local user context (identity leak risk under async) | request-scoped `AuthContext` dependency |
| Global shared DB session | request-scoped `AsyncSession` (commit/rollback per request) |
| `if model_type == "SageMaker" else Bedrock` branching in 5 files | registry pattern; new provider = one file |
| Deprecated LangChain 0.2 `Bedrock`/`BedrockChat` + per-model prompt formats | LangChain 0.3 `ChatBedrockConverse` (unified Converse API) |
| Prompts downloaded from S3 on every request | version-controlled in repo; optional S3 override, TTL-cached |
| Regex parsing of `<answer>` tags | structured responses |
| No streaming | SSE + WebSocket with a shared pipeline |
| No in-app ingestion (delegated to Bedrock KB) | full load → chunk → stamp → store pipeline (KB still supported) |
| 819-line chat god class / 582-line rag_query | focused services, each < 200 lines |
| DB password and AWS keys in code/Dockerfile; credentials-returning endpoint | secrets outside the repo (AWS chain / SSM); endpoint removed |
| No rate limiting, no cache in use, no tests | Redis rate limit + cache, unit test suite |