"""
App factory. Old server.py se farq:
  - config yahan (runtime pe) load hoti hai, import-time pe nahi
  - LangSmith env vars settings se set hote hain (SSM se aa sakti hai key)
  - lifespan hook: startup pe DB/Redis pings (Phase 1 mein add honge)
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.v1 import api_router
from src.config import get_settings
from src.core.exceptions import AppException
from src.core.logging import setup_logging
from src.infrastructure.cache.redis import close_redis, init_redis
from src.infrastructure.db.session import dispose_engine, init_engine


def _configure_langsmith() -> None:
    s = get_settings()
    if s.LANGSMITH_TRACING and s.LANGSMITH_API_KEY:
        os.environ["LANGSMITH_TRACING"] = "true"
        os.environ["LANGSMITH_API_KEY"] = s.LANGSMITH_API_KEY
        os.environ["LANGSMITH_PROJECT"] = s.LANGSMITH_PROJECT
    else:
        os.environ["LANGSMITH_TRACING"] = "false"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_engine()
    init_redis()
    yield
    await close_redis()
    await dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(debug=settings.DEBUG)
    _configure_langsmith()

    app = FastAPI(
        title="StarzPlay RAG API",
        version="2.0.0",
        docs_url=None if settings.ENV == "prod" else "/docs",
        redoc_url=None if settings.ENV == "prod" else "/redoc",
        lifespan=lifespan,
    )

    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials="*" not in origins,  # wildcard + credentials invalid combo hai
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status,
            content={"error_code": exc.error_code, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """Koi bhi unhandled error -> clean JSON 500 (empty reply kabhi nahi).
        Detail sirf logs mein — response mein internals leak nahi hote."""
        import logging

        logging.getLogger("app").exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"error_code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again."},
        )

    app.include_router(api_router)
    return app


app = create_app()