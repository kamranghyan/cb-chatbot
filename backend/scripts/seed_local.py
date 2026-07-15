"""
Local seed — minimal org hierarchy + ek test user + ek sample chat,
taake dev-token le kar chat endpoints turant test ho sakein.

Run (migrations ke baad):
    python -m scripts.seed_local
"""

import asyncio
from datetime import datetime, timedelta

import shortuuid
from sqlalchemy import select

from src.domain.enums import RoleId, SecurityLevel
from src.infrastructure.db.models import (
    Brand,
    Chat,
    ChatSession,
    Conversation,
    Department,
    Designation,
    Division,
    Role,
    Tenant,
    User,
    UserSession,
)
from src.infrastructure.db.session import get_db, init_engine

DEV_EMAIL = "dev@local.test"


async def seed() -> None:
    init_engine()
    async for db in get_db():
        existing = (await db.execute(select(User).where(User.email == DEV_EMAIL))).scalars().first()
        if existing:
            print(f"Already seeded: {DEV_EMAIL}")
            return

        tenant = Tenant(name="LocalTenant")
        db.add(tenant)
        await db.flush()

        dept = Department(name="Engineering", tenant_id=tenant.id)
        role = Role(name="admin", tenant_id=tenant.id)
        desig = Designation(name="Engineer", tenant_id=tenant.id)
        div = Division(name="Tech", tenant_id=tenant.id)
        brand = Brand(name="LocalBrand")
        db.add_all([dept, role, desig, div, brand])
        await db.flush()

        # role.id ko ADMIN banane ke liye hum seed order pe rely nahi karte —
        # note: RoleId.ADMIN == 1 tab hi match karega jab yeh pehla role ho.
        user = User(
            email=DEV_EMAIL,
            password="not-a-real-hash",  # Phase 6: proper login + hashing
            first_name="Dev",
            last_name="User",
            external_user_id=DEV_EMAIL,
            security_clearance=SecurityLevel.SECRET,
            department_id=dept.id,
            designation_id=desig.id,
            division_id=div.id,
            tenant_id=tenant.id,
            role_id=role.id,
            brand_id=brand.id,
        )
        db.add(user)
        await db.flush()

        session = UserSession(
            session_id=shortuuid.uuid(),
            external_user_id=user.external_user_id,
            end_datetime=datetime.now() + timedelta(days=7),
        )
        db.add(session)
        await db.flush()

        chat = Chat(
            title="Seed chat",
            model="anthropic.claude-3-sonnet-20240229-v1:0",
            email=DEV_EMAIL,
            brand_id=str(brand.id),
        )
        db.add(chat)
        await db.flush()

        db.add(ChatSession(external_chat_id=chat.external_chat_id, session_id=session.id))
        db.add(
            Conversation(
                external_chat_id=chat.external_chat_id,
                question="Seed question?",
                answer="Seed answer.",
                session_id=session.id,
                response_time=0.1,
            )
        )
        await db.flush()
        print(f"Seeded user={DEV_EMAIL}, chat={chat.external_chat_id}, role_id={role.id}")


if __name__ == "__main__":
    asyncio.run(seed())