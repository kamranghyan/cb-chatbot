"""
Chat routes. Ek hi RagChatService, teen transports:
    POST /api/v1/chat          -> JSON (Phase 3)
    POST /api/v1/chat/stream   -> SSE — Server-Sent Events (Phase 4)
    WS   /api/v1/chat/ws       -> WebSocket (Phase 4)

SSE vs WS kab kya: SSE simple hai (plain HTTP, proxies/ALB friendly) — 90%
chat UIs ke liye kaafi. WS bi-directional hai — typing indicators, ek hi
connection pe multi-turn. Dono diye hain, frontend jo chahe use kare.
"""

import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.schemas.chat import (
    ChatDetailOut,
    ChatListItemOut,
    ChatRequest,
    ChatResponse,
    FeedbackIn,
    IssueIn,
)
from src.core.auth import get_auth_context
from src.core.ratelimit import rate_limit_chat
from src.infrastructure.db.session import get_session_factory
from src.rag.factory import get_rag_components
from src.services.rag_chat_service import RagChatService

log = logging.getLogger(__name__)
from src.core.auth import RequireUser
from src.infrastructure.db.session import get_db
from src.services.chat_service import ChatService

router = APIRouter()

DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("", response_model=ChatResponse, dependencies=[Depends(rate_limit_chat)])
async def rag_chat(body: ChatRequest, ctx: RequireUser, db: DB):
    """Main RAG chat — Phase 3. Streaming version Phase 4 mein /stream pe."""
    service = RagChatService(db, get_rag_components())
    return await service.chat(
        ctx,
        question=body.question,
        external_chat_id=body.external_chat_id,
        is_regenerate=body.is_regenerate,
    )


@router.post("/stream", dependencies=[Depends(rate_limit_chat)])
async def rag_chat_stream(body: ChatRequest, ctx: RequireUser, db: DB):
    """
    SSE streaming chat. Events: meta -> token* -> sources -> done.
    Note: yeh POST-based SSE hai (question body mein) — browser EventSource
    sirf GET karta hai, is liye frontend fetch() + ReadableStream use kare.
    """
    service = RagChatService(db, get_rag_components())

    async def event_generator():
        try:
            async for event in service.chat_stream(
                ctx,
                question=body.question,
                external_chat_id=body.external_chat_id,
                is_regenerate=body.is_regenerate,
            ):
                yield {"event": event["event"], "data": json.dumps(event["data"])}
        except Exception as e:
            log.exception("Stream failed")
            yield {"event": "error", "data": json.dumps({"message": str(e)})}

    return EventSourceResponse(event_generator())


@router.websocket("/ws")
async def rag_chat_ws(websocket: WebSocket, token: str):
    """
    WebSocket chat — multi-turn, ek connection pe.
    Auth: ws://host/api/v1/chat/ws?token=<JWT>  (browsers WS pe headers nahi
    bhej sakte, is liye query param — TLS ke andar encrypted hota hai).
    Client bhejta hai: {"question": "...", "external_chat_id": "..."|null}
    Server wohi event protocol stream karta hai jo SSE ka hai.
    """
    await websocket.accept()
    session_factory = get_session_factory()

    # auth: get_auth_context HTTP dependency hai — WS pe manually same steps
    try:
        async with session_factory() as db:
            from fastapi.security import HTTPAuthorizationCredentials

            creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            ctx = await get_auth_context(creds, db)
    except Exception:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                question = msg["question"]
            except (json.JSONDecodeError, KeyError):
                await websocket.send_json({"event": "error", "data": {"message": "Invalid message"}})
                continue

            # har message apni DB session (WS long-lived hai, session nahi hona chahiye)
            async with session_factory() as db:
                try:
                    service = RagChatService(db, get_rag_components())
                    async for event in service.chat_stream(
                        ctx,
                        question=question,
                        external_chat_id=msg.get("external_chat_id"),
                        is_regenerate=msg.get("is_regenerate", False),
                    ):
                        await websocket.send_json(event)
                    await db.commit()
                except Exception as e:
                    await db.rollback()
                    log.exception("WS chat failed")
                    await websocket.send_json({"event": "error", "data": {"message": str(e)}})
    except WebSocketDisconnect:
        log.info("WS client disconnected")


@router.get("/list", response_model=list[ChatListItemOut])
async def get_chat_list(ctx: RequireUser, db: DB):
    return await ChatService(db).get_chat_list(ctx)


@router.get("/session/{session_id}", response_model=list[ChatListItemOut])
async def get_chats_by_session(session_id: int, ctx: RequireUser, db: DB):
    return await ChatService(db).get_chats_by_session(session_id)


@router.get("/{external_chat_id}", response_model=ChatDetailOut)
async def get_chat(external_chat_id: str, ctx: RequireUser, db: DB):
    return await ChatService(db).get_chat(external_chat_id)


@router.post("/{external_chat_id}/issue")
async def report_issue(external_chat_id: str, body: IssueIn, ctx: RequireUser, db: DB):
    """Old system ka category/issue flow: chat pe issue file karo ->
    (optional) support email + Salesforce case. Dono fail-soft hain."""
    from src.infrastructure.notifications.email import EmailService
    from src.infrastructure.notifications.salesforce import SalesforceService
    from src.config import get_settings

    chat = await ChatService(db).get_chat(external_chat_id)
    chat.category = body.category
    chat.sub_category = body.sub_category
    chat.issue_description = body.description
    await db.flush()

    s = get_settings()
    email_sent = False
    if s.SUPPORT_EMAIL:
        email_sent = await EmailService().send(
            s.SUPPORT_EMAIL,
            f"[Chatbot Issue] {body.category.value}: {body.sub_category.value if body.sub_category else ''}",
            f"<p>Chat: {external_chat_id}</p><p>User: {ctx.email}</p><p>{body.description}</p>",
        )
    case_id = await SalesforceService().create_case(
        subject=f"{body.category.value} - chat {external_chat_id}",
        description=body.description or "",
        email=ctx.email,
    )
    return {"external_chat_id": external_chat_id, "email_sent": email_sent, "salesforce_case_id": case_id}


@router.post("/feedback/{external_conv_id}")
async def conversation_feedback(external_conv_id: str, body: FeedbackIn, ctx: RequireUser, db: DB):
    convo = await ChatService(db).conversation_feedback(
        external_conv_id, body.model_dump(exclude_none=True)
    )
    return {"external_conv_id": convo.external_conv_id, "reaction": convo.reaction}