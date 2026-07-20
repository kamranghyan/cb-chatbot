"""
Dev auth — SIRF local env.

Old system mein token issuance user_svc se hota tha; Phase 1 test karne ke
liye yeh endpoint local pe test user + active session bana kar JWT deta hai.
Production login/refresh flow Phase 6 mein properly aayega.
Old '/devops-user' endpoint (jo AWS keys return karta tha) intentionally REMOVED.
"""

from datetime import datetime, timedelta
from typing import Annotated

import shortuuid
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.schemas.auth import LoginIn, RefreshIn, SignupIn, TokenOut
from src.api.v1.schemas.chat import DevTokenIn
from src.services.cognito_auth_service import CognitoAuthService
from src.config import get_settings
from src.core.auth import TokenHelper
from src.core.exceptions import NotFoundError
from src.infrastructure.db.models import User, UserSession
from src.infrastructure.db.session import get_db

router = APIRouter()


def _cognito_only() -> None:
    """Yeh endpoints sirf AUTH_PROVIDER=cognito pe exist karte hain."""
    if get_settings().AUTH_PROVIDER != "cognito":
        raise NotFoundError()


@router.post("/signup", response_model=TokenOut)
async def signup(body: SignupIn):
    """Guest flytime flow: signup -> auto-confirm -> guest group -> AUTO-LOGIN.
    Response mein tokens — frontend seedha chat pe le jaye (login screen skip).
    60 min baad token expire -> 401 -> user dobara login kare."""
    _cognito_only()
    return await CognitoAuthService().signup_guest(body.email, body.password)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn):
    """Admin/tenant: client_type=main (default, 30-din refresh).
    Guest re-login: client_type=guest (60-min flytime)."""
    _cognito_only()
    return await CognitoAuthService().login(body.email, body.password, body.client_type)


@router.post("/refresh", response_model=TokenOut)
async def refresh(body: RefreshIn):
    _cognito_only()
    return await CognitoAuthService().refresh(body.refresh_token, body.client_type)


@router.post("/dev-token")
async def dev_token(body: DevTokenIn, db: Annotated[AsyncSession, Depends(get_db)]):
    s = get_settings()
    if not s.is_local:
        raise NotFoundError()  # non-local pe endpoint exist hi nahi karta effectively

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalars().first()
    if user is None:
        raise NotFoundError(f"User '{body.email}' not found — pehle scripts/seed_local.py chalao")

    session = UserSession(
        session_id=shortuuid.uuid(),
        external_user_id=user.external_user_id,
        end_datetime=datetime.now() + timedelta(hours=8),
    )
    db.add(session)
    await db.flush()

    token = TokenHelper.encode(
        {
            "user_id": user.id,
            "email": user.email,
            "role_id": user.role_id,
            "department_id": user.department_id,
            "security_clearance": user.security_clearance.name,
            "brand_id": str(user.brand_id),
            "session_id": session.id,
            "external_session_id": session.session_id,
        },
        expire_seconds=8 * 3600,
    )
    return {"access_token": token, "token_type": "bearer"}