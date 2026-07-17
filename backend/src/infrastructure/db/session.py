"""
Async engine + session management.

Old system: AlchemyMiddleware + scoped session global (`from core.persistence
import session`) — har jagah ek hi global session object, jo async mein
request-bleed ka risk hai. Naya pattern: request-scoped session via
FastAPI dependency. Route/service ko `AsyncSession` inject hota hai,
request end pe auto commit/rollback + close.
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from src.config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def init_engine() -> AsyncEngine:
    """app lifespan startup pe call hota hai."""
    global _engine, _session_factory
    if _engine is None:
        s = get_settings()
        _engine = create_async_engine(
            s.database_url,
            echo=s.DEBUG,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: async with get_db as session."""
    if _session_factory is None:
        init_engine()
    async with _session_factory() as session:  # type: ignore[misc]
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise