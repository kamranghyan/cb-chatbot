# Netflix RAG — v2 (Modernized)

Phase 0 boilerplate. Legacy monolith ka modular, provider-swappable rewrite.

## Architecture (ports & adapters)

```
api/            HTTP / SSE / WebSocket — sirf transport
services/       use-case orchestration (thin)
rag/            core: har capability ka interface + providers
  llm/          base.py (port) + providers/ (bedrock, sagemaker, ollama...)
  embed/        base.py + providers/
  vectorstore/  base.py + providers/ (pgvector, bedrock_kb)
  chunk/        base.py + providers/
  ingest/       base.py + providers/
  factory.py    .env -> concrete providers (selection ki WAHID jagah)
infrastructure/ db, cache, aws clients, notifications
config/         Settings (env > .env > SSM fallback > defaults)
core/           logging, exceptions, middlewares
```

Provider badalna = `.env` mein ek line. Naya model/provider = ek nayi file
`providers/` mein + `@register_*` decorator. Business code untouched.

## Run — Local (no AWS needed)

```bash
cp .env.example .env        # defaults local ke liye complete hain
docker compose up -d        # app + pgvector + redis
# ya bare metal:
poetry install
python -m src.main
```

Verify: http://localhost:8000/health aur /docs

## Run — AWS (dev/qa/prod)

```bash
ENV=dev  # + IAM role/creds available hon
```

- `ENV != local` => SSM fallback auto ON
- Jo value env/.env mein hai, wohi jeet-ti hai; jo missing hai, woh
  `src/config/ssm_mapping.json` ke mapping se SSM se aati hai
- SSM down/param missing => warning log, defaults use, app crash nahi karti

Apne existing SSM parameter names `ssm_mapping.json` mein per-env update karo.

## Config priority

```
OS env  >  .env file  >  SSM Parameter Store  >  code defaults
```

## Phases

- [x] **Phase 0** — skeleton, settings + SSM fallback, docker, health, RAG ports
- [ ] Phase 1 — DB (SQLAlchemy 2.0), Alembic carry-over, auth/RBAC, chat CRUD
- [ ] Phase 2 — providers: Bedrock LLM (langchain-aws), Cohere embeddings, PGVector, Bedrock KB + LangSmith
- [ ] Phase 3 — chat pipeline (retrieve -> prompt -> generate), memory, guardrails
- [ ] Phase 4 — streaming: SSE `/chat/stream` + WebSocket
- [ ] Phase 5 — ingestion pipeline (load -> chunk -> embed -> store)
- [ ] Phase 6 — analytics, RAG triad, Salesforce/SendGrid, cache, tests, hardening
