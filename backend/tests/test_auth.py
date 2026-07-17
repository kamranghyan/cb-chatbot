"""JWT encode/decode + clearance hierarchy tests."""

import pytest

from src.core.auth import TokenHelper
from src.core.exceptions import UnauthorizedError
from src.domain.enums import SecurityLevel


def test_token_roundtrip():
    token = TokenHelper.encode({"user_id": 7, "email": "a@b.c"})
    decoded = TokenHelper.decode(token)
    assert decoded["user_id"] == 7
    assert decoded["email"] == "a@b.c"


def test_invalid_token_raises():
    with pytest.raises(UnauthorizedError):
        TokenHelper.decode("garbage.token.here")


def test_clearance_hierarchy():
    assert SecurityLevel.PUBLIC.allowed_levels() == ["public"]
    assert SecurityLevel.PRIVATE.allowed_levels() == ["public", "private"]
    assert SecurityLevel.SECRET.allowed_levels() == ["public", "private", "secret"]