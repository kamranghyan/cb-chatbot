"""
Rate limiting — Redis sliding-minute counter, per-user.
Old system mein koi rate limit nahi tha (LLM endpoints = paise + abuse risk).
Fail-open: Redis down ho to request allow (availability > strictness yahan).
"""

import time
from http import HTTPStatus

from src.config import get_settings
from src.core.auth import RequireUser
from src.core.exceptions import AppException
from src.infrastructure.cache.redis import incr_with_ttl


class RateLimitExceeded(AppException):
    def __init__(self, limit: int):
        super().__init__(
            HTTPStatus.TOO_MANY_REQUESTS,
            f"Rate limit exceeded ({limit}/min). Thodi der baad try karein.",
            "RATE_LIMITED",
        )


async def rate_limit_chat(ctx: RequireUser) -> None:
    """Dependency — chat/stream endpoints pe lagta hai."""
    s = get_settings()
    if s.RATE_LIMIT_PER_MINUTE <= 0:  # 0 = disabled
        return
    window = int(time.time() // 60)
    count = await incr_with_ttl(f"rl:chat:{ctx.user_id}:{window}", 70)
    if count is not None and count > s.RATE_LIMIT_PER_MINUTE:
        raise RateLimitExceeded(s.RATE_LIMIT_PER_MINUTE)