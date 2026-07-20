# Backend endpoints needed for the Conversation Management Dashboard

The dashboard's admin views (Conversations, Unanswered Questions, Issues)
are fully built and working — but on **demo data**, because the current
backend (`api/v1/`) has no endpoint that lets an admin see *other users'*
chats. `GET /chat/list` only returns the calling user's own chats
(`ChatService.get_chat_list` filters by `ctx.email`).

Below is the minimal addition to unblock real data. Everything else
(Chat/Conversation models, category/sub_category/issue_description fields)
already exists — this is a thin admin-scoped read layer on top of it.

## 1. New router: `api/v1/admin.py`

```python
"""Admin-only cross-user views for the Conversation Management Dashboard."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.auth import RequireAdmin
from src.infrastructure.db.session import get_db
from src.infrastructure.db.models import Chat, Conversation, User

router = APIRouter()
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/conversation-users")
async def list_conversation_users(ctx: RequireAdmin, db: DB):
    """One row per user who has at least one chat, with rollup counts."""
    rows = (
        await db.execute(
            select(
                Chat.email,
                func.count(func.distinct(Chat.id)).label("conversation_count"),
                func.max(Chat.created_at).label("last_activity"),
            )
            .where(Chat.email.is_not(None))
            .group_by(Chat.email)
            .order_by(func.max(Chat.created_at).desc())
        )
    ).all()

    out = []
    for email, conv_count, last_activity in rows:
        user = (await db.execute(select(User).where(User.email == email))).scalars().first()
        unanswered = (
            await db.execute(
                select(func.count(Conversation.id))
                .join(Chat, Chat.external_chat_id == Conversation.external_chat_id)
                .where(Chat.email == email, Conversation.answer.is_(None))
            )
        ).scalar() or 0
        open_issues = (
            await db.execute(
                select(func.count(Chat.id))
                .where(Chat.email == email, Chat.issue_description.is_not(None))
                # add a real `resolved` boolean column (see section 3) to filter open ones precisely
            )
        ).scalar() or 0
        out.append({
            "email": email,
            "first_name": user.first_name if user else "",
            "last_name": user.last_name if user else "",
            "conversation_count": conv_count,
            "unanswered_count": unanswered,
            "open_issue_count": open_issues,
            "last_activity": last_activity,
        })
    return out


@router.get("/conversation-users/{email}/threads")
async def get_user_threads(email: str, ctx: RequireAdmin, db: DB):
    """Full conversation history for one user — every chat + every Q&A."""
    result = await db.execute(
        select(Chat)
        .where(Chat.email == email)
        .options(selectinload(Chat.conversations).selectinload(Conversation.sources))
        .order_by(Chat.created_at.desc())
    )
    chats = result.scalars().all()
    return [
        {
            "external_chat_id": c.external_chat_id,
            "title": c.title,
            "email": c.email,
            "created_at": c.created_at,
            "exchanges": [
                {
                    "external_conv_id": conv.external_conv_id,
                    "question": conv.question,
                    "answer": conv.answer,  # None = unanswered
                    "sources": [{"content": s.doc_metadata, "score": None} for s in conv.sources],
                    "reaction": conv.reaction,
                    "created_at": conv.created_at,
                }
                for conv in c.conversations
            ],
            "issue": (
                {
                    "category": c.category.value if c.category else None,
                    "sub_category": c.sub_category.value if c.sub_category else None,
                    "description": c.issue_description,
                    "resolution": None,  # see section 3 — no column for this yet
                    "resolved": False,   # see section 3
                }
                if c.issue_description else None
            ),
        }
        for c in chats
    ]


@router.get("/unanswered-questions")
async def list_unanswered(ctx: RequireAdmin, db: DB):
    """Flat list across ALL users — for the dedicated review screen."""
    rows = (
        await db.execute(
            select(Conversation, Chat.email)
            .join(Chat, Chat.external_chat_id == Conversation.external_chat_id)
            .where(Conversation.answer.is_(None))
            .order_by(Conversation.created_at.desc())
        )
    ).all()
    return [
        {
            "external_conv_id": conv.external_conv_id,
            "external_chat_id": conv.external_chat_id,
            "email": email,
            "question": conv.question,
            "created_at": conv.created_at,
        }
        for conv, email in rows
    ]


@router.get("/issues")
async def list_issues(ctx: RequireAdmin, db: DB):
    result = await db.execute(
        select(Chat).where(Chat.issue_description.is_not(None)).order_by(Chat.created_at.desc())
    )
    chats = result.scalars().all()
    return [
        {
            "external_chat_id": c.external_chat_id,
            "email": c.email,
            "title": c.title,
            "category": c.category.value if c.category else None,
            "sub_category": c.sub_category.value if c.sub_category else None,
            "description": c.issue_description,
            "resolution": None,   # see section 3
            "resolved": False,    # see section 3
            "created_at": c.created_at,
        }
        for c in chats
    ]
```

Register it in `src/app.py` (or wherever routers are mounted) alongside the
others:
```python
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
```

## 2. `User` needs `first_name`/`last_name` reachable by email — already true
(`User` model has these; the query above does a second lookup per user,
fine at this scale — can be optimized to a JOIN later if needed).

## 3. Missing: issue resolution tracking

There's currently no column to mark an issue "resolved" or record a
solution. Two small additions to `Chat` (or a new `chat_resolution` table if
you'd rather not touch `Chat` further):

```python
resolved: Mapped[bool] = mapped_column(Boolean, default=False)
resolution: Mapped[str | None] = mapped_column(Unicode(2000), nullable=True)
```

Plus a small admin-only endpoint to set them:
```python
@router.patch("/conversations/{external_chat_id}/resolve")
async def resolve_issue(external_chat_id: str, body: ResolveIn, ctx: RequireAdmin, db: DB):
    chat = await ChatService(db).get_chat(external_chat_id)
    chat.resolved = True
    chat.resolution = body.resolution
    await db.flush()
    return {"external_chat_id": external_chat_id, "resolved": True}
```

## Once these exist — frontend swap is trivial

Every function in `src/services/conversations.service.ts` uses
`mockOnlyClient`. Change it to `apiClient` (already imported the same way
everywhere else) and update `ENDPOINTS.adminConversations.*` paths if they
differ from `/admin/...` above. No other file changes — same pattern
already used for the Chat/Ingestion/Analytics services in this project.
