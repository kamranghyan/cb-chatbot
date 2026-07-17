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

from src.api.v1.schemas.chat import DevTokenIn
from src.config import get_settings
from src.core.auth import TokenHelper
from src.core.exceptions import NotFoundError
from src.infrastructure.db.models import User, UserSession
from src.infrastructure.db.session import get_db

router = APIRouter()


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