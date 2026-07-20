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
    
    @property
    def is_guest(self) -> bool:
        return self.role_id == RoleId.GUEST

    @property
    def is_tenant_or_above(self) -> bool:
        return self.role_id in (RoleId.TENANT, RoleId.ADMIN, RoleId.SUPER_ADMIN)


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
    Har protected route ki dependency — provider-switched (.env AUTH_PROVIDER):
      local   -> hamara HS256 JWT + DB session check (dev-token flow)
      cognito -> JWKS verify + groups->role + lazy provisioning
    Dono ka output SAME AuthContext — aage ka koi code (chat/RBAC/rate-limit)
    farq nahi dekhta.
    """
    if credentials is None:
        raise UnauthorizedError("Missing Authorization header")

    from src.config import get_settings

    if get_settings().AUTH_PROVIDER == "cognito":
        return await _cognito_auth_context(credentials.credentials, db)

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


async def _cognito_auth_context(token: str, db: AsyncSession) -> AuthContext:
    """Cognito path: verify -> role map -> provision -> session -> AuthContext."""
    from src.core.cognito import map_groups_to_role, verify_cognito_token
    from src.core.provisioning import get_or_create_session, get_or_provision_user

    claims = await verify_cognito_token(token)
    role_id = map_groups_to_role(claims.get("cognito:groups", []))

    # email: id_token mein hota hai; access_token mein nahi -> pehli dafa
    # (provisioning pe) Cognito admin API se le lete hain, uske baad DB se
    email = claims.get("email")
    if email is None:
        email = await _lookup_email(db, claims["sub"], claims.get("username", ""))

    user = await get_or_provision_user(db, cognito_sub=claims["sub"], email=email, role_id=role_id)
    session = await get_or_create_session(db, user, token_exp=claims["exp"])

    return AuthContext(
        user_id=user.id,
        email=user.email,
        role_id=role_id,  # Cognito groups = source of truth (DB row nahi)
        department_id=user.department_id,
        security_clearance=user.security_clearance.name,
        brand_id=str(user.brand_id),
        session_id=session.id,
        external_session_id=session.session_id,
        token=token,
    )


async def _lookup_email(db: AsyncSession, sub: str, username: str) -> str:
    """Access token mein email nahi hota. Pehle DB dekho (repeat requests
    free), warna ek dafa Cognito admin_get_user (sirf first-provisioning pe)."""
    from sqlalchemy import select

    from src.infrastructure.db.models import User

    result = await db.execute(select(User.email).where(User.external_user_id == sub))
    email = result.scalar()
    if email:
        return email

    import asyncio

    import boto3

    from src.config import get_settings

    s = get_settings()
    client = boto3.client("cognito-idp", region_name=s.COGNITO_REGION)
    resp = await asyncio.to_thread(
        client.admin_get_user, UserPoolId=s.COGNITO_USER_POOL_ID, Username=username or sub
    )
    attrs = {a["Name"]: a["Value"] for a in resp.get("UserAttributes", [])}
    return attrs.get("email", f"{sub}@unknown.cognito")


# ---- RBAC dependencies (old ClaimDependency([isUser]) / ([isAdmin]) ka replacement) ----

RequireUser = Annotated[AuthContext, Depends(get_auth_context)]


async def _require_admin(ctx: RequireUser) -> AuthContext:
    if not ctx.is_admin:
        raise UnauthorizedError("Admin role required")
    return ctx


RequireAdmin = Annotated[AuthContext, Depends(_require_admin)]


async def _require_tenant(ctx: RequireUser) -> AuthContext:
    """Tenant ya usse upar (guest blocked)."""
    if not ctx.is_tenant_or_above:
        raise UnauthorizedError("Tenant role required")
    return ctx


RequireTenant = Annotated[AuthContext, Depends(_require_tenant)]