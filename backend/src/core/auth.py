"""
Auth — old system ke 3 pieces (AuthenticationMiddleware + ApplicationContext
+ ClaimDependency) ka ek clean replacement.

Old problem samjho: ApplicationContext threading.local pe based tha. Async
FastAPI mein multiple requests EK hi thread pe interleave hoti hain —
matlab user A ka context user B ki request mein leak ho sakta tha (security
bug class). Naya design: AuthContext ek dataclass hai jo dependency se
request-scoped inject hota hai — koi global state nahi.

JWT payload old system jaisa hi hai (email, department_id, security_clearance,
role_id, session_id, external_session_id, user_id, brand_id) — token
compatibility maintained.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.core.exceptions import UnauthorizedError
from src.domain.enums import RoleId
from src.infrastructure.db.models import UserSession
from src.infrastructure.db.session import get_db

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    """Request-scoped user identity — services isko parameter ke tor pe lein."""

    user_id: int
    email: str
    role_id: int
    department_id: int | None
    security_clearance: str
    brand_id: str | None
    session_id: int
    external_session_id: str
    token: str

    @property
    def is_admin(self) -> bool:
        return self.role_id in (RoleId.ADMIN, RoleId.SUPER_ADMIN)

    @property
    def is_super_admin(self) -> bool:
        return self.role_id == RoleId.SUPER_ADMIN


class TokenHelper:
    @staticmethod
    def encode(payload: dict, expire_seconds: int = 3600) -> str:
        s = get_settings()
        return jwt.encode(
            {**payload, "exp": datetime.now(timezone.utc) + timedelta(seconds=expire_seconds)},
            s.JWT_SECRET_KEY,
            algorithm=s.JWT_ALGORITHM,
        )

    @staticmethod
    def decode(token: str) -> dict:
        s = get_settings()
        try:
            return jwt.decode(token, s.JWT_SECRET_KEY, algorithms=[s.JWT_ALGORITHM])
        except JWTError as e:
            raise UnauthorizedError(f"Invalid token: {e}")


async def get_auth_context(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthContext:
    """
    Har protected route ki dependency. Steps (old AuthExecutor jaisa):
      1. Bearer token parse + JWT verify
      2. user_sessions table mein active session check (end_datetime future mein ho)
      3. AuthContext build
    """
    if credentials is None:
        raise UnauthorizedError("Missing Authorization header")

    decoded = TokenHelper.decode(credentials.credentials)

    result = await db.execute(
        select(UserSession).where(
            and_(
                UserSession.session_id == decoded.get("external_session_id"),
                UserSession.end_datetime >= datetime.now(),
            )
        )
    )
    if result.scalars().first() is None:
        raise UnauthorizedError("Session expired or invalid")

    return AuthContext(
        user_id=decoded.get("user_id"),
        email=decoded.get("email"),
        role_id=decoded.get("role_id"),
        department_id=decoded.get("department_id"),
        security_clearance=decoded.get("security_clearance", "PUBLIC"),
        brand_id=decoded.get("brand_id"),
        session_id=decoded.get("session_id"),
        external_session_id=decoded.get("external_session_id"),
        token=credentials.credentials,
    )


# ---- RBAC dependencies (old ClaimDependency([isUser]) / ([isAdmin]) ka replacement) ----

RequireUser = Annotated[AuthContext, Depends(get_auth_context)]


async def _require_admin(ctx: RequireUser) -> AuthContext:
    if not ctx.is_admin:
        raise UnauthorizedError("Admin role required")
    return ctx


RequireAdmin = Annotated[AuthContext, Depends(_require_admin)]