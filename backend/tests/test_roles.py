"""Role/RBAC tests — Phase D: dependencies, guest limits, role helpers."""

import pytest

from src.core.auth import AuthContext, _require_admin, _require_tenant
from src.core.exceptions import UnauthorizedError
from src.core.ratelimit import _limit_for
from src.domain.enums import ROLE_DEFAULT_CLEARANCE, RoleId, SecurityLevel


def _ctx(role_id: int) -> AuthContext:
    return AuthContext(
        user_id=1, email="u@test.com", role_id=role_id, department_id=1,
        security_clearance="PUBLIC", brand_id="1", session_id=1,
        external_session_id="s", token="t",
    )


def test_role_helpers():
    assert _ctx(RoleId.ADMIN).is_admin
    assert _ctx(RoleId.GUEST).is_guest
    assert not _ctx(RoleId.GUEST).is_tenant_or_above
    assert _ctx(RoleId.TENANT).is_tenant_or_above
    assert _ctx(RoleId.SUPER_ADMIN).is_tenant_or_above


@pytest.mark.asyncio
async def test_require_admin_blocks_guest_and_tenant():
    assert await _require_admin(_ctx(RoleId.ADMIN))
    for role in (RoleId.GUEST, RoleId.TENANT):
        with pytest.raises(UnauthorizedError):
            await _require_admin(_ctx(role))


@pytest.mark.asyncio
async def test_require_tenant_blocks_only_guest():
    assert await _require_tenant(_ctx(RoleId.TENANT))
    assert await _require_tenant(_ctx(RoleId.ADMIN))
    with pytest.raises(UnauthorizedError):
        await _require_tenant(_ctx(RoleId.GUEST))


def test_guest_gets_stricter_rate_limit(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "20")
    monkeypatch.setenv("GUEST_RATE_LIMIT_PER_MINUTE", "5")
    from src.config import get_settings
    get_settings.cache_clear()
    assert _limit_for(_ctx(RoleId.GUEST)) == 5
    assert _limit_for(_ctx(RoleId.ADMIN)) == 20
    assert _limit_for(_ctx(RoleId.TENANT)) == 20
    get_settings.cache_clear()


def test_role_clearance_mapping():
    """Provisioning clearance: yehi guest ko private/secret docs se rokta hai."""
    assert ROLE_DEFAULT_CLEARANCE[RoleId.GUEST] == SecurityLevel.PUBLIC
    assert ROLE_DEFAULT_CLEARANCE[RoleId.TENANT] == SecurityLevel.PRIVATE
    assert ROLE_DEFAULT_CLEARANCE[RoleId.ADMIN] == SecurityLevel.SECRET