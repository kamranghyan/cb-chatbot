"""Analytics routes — admin only."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.auth import RequireAdmin
from src.infrastructure.db.session import get_db
from src.services.analytics_service import AnalyticsService

router = APIRouter()

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/summary")
async def analytics_summary(ctx: RequireAdmin, db: DB):
    return await AnalyticsService(db).summary()


@router.get("/daily")
async def analytics_daily(ctx: RequireAdmin, db: DB, days: int = Query(14, ge=1, le=90)):
    return await AnalyticsService(db).daily(days)