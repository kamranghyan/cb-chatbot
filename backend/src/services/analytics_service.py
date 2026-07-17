"""
Analytics — old analytics endpoints ka port, Redis cache ke saath (60s TTL).
Heavy aggregate queries har dashboard refresh pe DB na maarein.
"""

from datetime import datetime, timedelta

from sqlalchemy import Integer, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.cache.redis import cache_get_json, cache_set_json
from src.infrastructure.db.models import Chat, Conversation, IngestionMetadata

_CACHE_TTL = 60


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def summary(self) -> dict:
        cached = await cache_get_json("analytics:summary")
        if cached:
            return {**cached, "cached": True}

        chats = (await self.db.execute(select(func.count(Chat.id)))).scalar() or 0
        convs, avg_rt = (
            await self.db.execute(
                select(func.count(Conversation.id), func.avg(Conversation.response_time))
            )
        ).one()
        likes, dislikes = (
            await self.db.execute(
                select(
                    func.coalesce(
                        func.sum(
                            case((Conversation.reaction["liked"].as_string() == "true", 1), else_=0)
                        ),
                        0,
                    ),
                    func.coalesce(
                        func.sum(
                            case((Conversation.reaction["disliked"].as_string() == "true", 1), else_=0)
                        ),
                        0,
                    ),
                )
            )
        ).one()
        ingestions = (
            await self.db.execute(
                select(IngestionMetadata.status, func.count(IngestionMetadata.id))
                .group_by(IngestionMetadata.status)
            )
        ).all()

        data = {
            "total_chats": chats,
            "total_conversations": int(convs or 0),
            "avg_response_time": round(float(avg_rt), 3) if avg_rt else None,
            "feedback": {"likes": int(likes), "dislikes": int(dislikes)},
            "ingestions_by_status": {s.value: c for s, c in ingestions},
            "cached": False,
        }
        await cache_set_json("analytics:summary", data, _CACHE_TTL)
        return data

    async def daily(self, days: int = 14) -> list[dict]:
        since = datetime.now() - timedelta(days=days)
        rows = (
            await self.db.execute(
                select(
                    func.date(Conversation.created_at).label("day"),
                    func.count(Conversation.id),
                    func.avg(Conversation.response_time),
                )
                .where(Conversation.created_at >= since)
                .group_by(func.date(Conversation.created_at))
                .order_by(func.date(Conversation.created_at))
            )
        ).all()
        return [
            {"day": str(day), "conversations": int(cnt), "avg_response_time": round(float(rt), 3) if rt else None}
            for day, cnt, rt in rows
        ]