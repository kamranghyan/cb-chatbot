"""
Lazy user provisioning — Cognito user pehli dafa API hit kare to DB mein
uska record auto-create (users, default org, active session).

Kyun zaroori: chats, conversations, RBAC — sab DB user/session se juray hain.
Cognito sirf identity deta hai; hamara data model DB mein hai. Manual sync
ke bajaye first-request pe provision — zero ops.
"""

import logging
from datetime import datetime, timezone

import shortuuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.enums import ROLE_DEFAULT_CLEARANCE, RoleId
from src.infrastructure.db.models import (
    Brand, Department, Designation, Division, Role, Tenant, User, UserSession,
)

log = logging.getLogger(__name__)

_DEFAULT_ORG_NAME = "default"


async def _get_or_create(db: AsyncSession, model, defaults: dict, **lookup):
    result = await db.execute(select(model).filter_by(**lookup))
    row = result.scalars().first()
    if row is None:
        row = model(**lookup, **defaults)
        db.add(row)
        await db.flush()
    return row


async def get_or_provision_user(
    db: AsyncSession, cognito_sub: str, email: str, role_id: int
) -> User:
    result = await db.execute(select(User).where(User.external_user_id == cognito_sub))
    user = result.scalars().first()
    if user is not None:
        return user

    # default org hierarchy (users table ke NOT NULL FKs ke liye)
    tenant = await _get_or_create(db, Tenant, {}, name=_DEFAULT_ORG_NAME)
    dept = await _get_or_create(db, Department, {"tenant_id": tenant.id}, name=_DEFAULT_ORG_NAME)
    desig = await _get_or_create(db, Designation, {"tenant_id": tenant.id}, name=_DEFAULT_ORG_NAME)
    div = await _get_or_create(db, Division, {"tenant_id": tenant.id}, name=_DEFAULT_ORG_NAME)
    brand = await _get_or_create(db, Brand, {}, name=_DEFAULT_ORG_NAME)
    role_name = {v: k for k, v in {"admin": RoleId.ADMIN, "tenant": RoleId.TENANT, "guest": RoleId.GUEST}.items()}.get(role_id, "guest")
    role = await _get_or_create(db, Role, {"tenant_id": tenant.id}, name=role_name)

    user = User(
        email=email,
        password="cognito-managed",  # passwords ab Cognito ke paas — DB mein kabhi nahi
        first_name=email.split("@")[0],
        external_user_id=cognito_sub,
        security_clearance=ROLE_DEFAULT_CLEARANCE.get(role_id, ROLE_DEFAULT_CLEARANCE[RoleId.GUEST]),
        department_id=dept.id, designation_id=desig.id, division_id=div.id,
        tenant_id=tenant.id, role_id=role.id, brand_id=brand.id,
    )
    db.add(user)
    await db.flush()
    log.info("Provisioned cognito user %s (role_id=%d)", email, role_id)
    return user


async def get_or_create_session(db: AsyncSession, user: User, token_exp: int) -> UserSession:
    """Active session reuse karo warna banao. end_datetime = token expiry —
    Cognito ki flytime hi DB session ki lifetime hai (single source of truth AWS)."""
    now = datetime.now()
    result = await db.execute(
        select(UserSession).where(
            UserSession.external_user_id == user.external_user_id,
            UserSession.end_datetime >= now,
        ).order_by(UserSession.id.desc())
    )
    session = result.scalars().first()
    exp_dt = datetime.fromtimestamp(token_exp, tz=timezone.utc).replace(tzinfo=None)
    if session is None:
        session = UserSession(
            session_id=shortuuid.uuid(),
            external_user_id=user.external_user_id,
            end_datetime=exp_dt,
        )
        db.add(session)
        await db.flush()
    elif session.end_datetime < exp_dt:
        session.end_datetime = exp_dt  # naya token aya to session extend
        await db.flush()
    return session