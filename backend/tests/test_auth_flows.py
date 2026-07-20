"""
Cognito auth flow tests — moto (AWS mock) se, real AWS ke bagair.
Guest flytime flow + login + refresh + negative cases.
"""

import boto3
import pytest
from moto import mock_aws

from src.core.exceptions import AppException, UnauthorizedError

REGION = "ap-south-1"


@pytest.fixture
def cognito_env(monkeypatch):
    with mock_aws():
        client = boto3.client("cognito-idp", region_name=REGION)
        pool = client.create_user_pool(
            PoolName="test-pool",
            AutoVerifiedAttributes=["email"],
            UsernameAttributes=["email"],
        )["UserPool"]
        main = client.create_user_pool_client(
            UserPoolId=pool["Id"], ClientName="main",
            ExplicitAuthFlows=["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
        )["UserPoolClient"]
        guest = client.create_user_pool_client(
            UserPoolId=pool["Id"], ClientName="guest",
            ExplicitAuthFlows=["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
        )["UserPoolClient"]
        for g in ("admin", "tenant", "guest-user"):
            client.create_group(UserPoolId=pool["Id"], GroupName=g)

        monkeypatch.setenv("AUTH_PROVIDER", "cognito")
        monkeypatch.setenv("COGNITO_USER_POOL_ID", pool["Id"])
        monkeypatch.setenv("COGNITO_REGION", REGION)
        monkeypatch.setenv("COGNITO_CLIENT_ID", main["ClientId"])
        monkeypatch.setenv("COGNITO_GUEST_CLIENT_ID", guest["ClientId"])
        from src.config import get_settings
        get_settings.cache_clear()
        yield {"client": client, "pool_id": pool["Id"]}
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_guest_signup_auto_login(cognito_env):
    """Flytime flow: signup response mein hi tokens (login screen skip)."""
    from src.services.cognito_auth_service import CognitoAuthService

    tokens = await CognitoAuthService().signup_guest("guest@test.com", "GuestPass123!")
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert tokens["token_type"] == "bearer"

    # user guest-user group mein gaya?
    groups = cognito_env["client"].admin_list_groups_for_user(
        UserPoolId=cognito_env["pool_id"], Username="guest@test.com"
    )["Groups"]
    assert [g["GroupName"] for g in groups] == ["guest-user"]


@pytest.mark.asyncio
async def test_duplicate_signup_conflict(cognito_env):
    from src.services.cognito_auth_service import CognitoAuthService

    svc = CognitoAuthService()
    await svc.signup_guest("dup@test.com", "GuestPass123!")
    with pytest.raises(AppException) as e:
        await svc.signup_guest("dup@test.com", "GuestPass123!")
    assert e.value.status == 409


@pytest.mark.asyncio
async def test_login_and_refresh(cognito_env):
    from src.services.cognito_auth_service import CognitoAuthService

    svc = CognitoAuthService()
    await svc.signup_guest("u@test.com", "GuestPass123!")

    tokens = await svc.login("u@test.com", "GuestPass123!", client_type="guest")
    assert tokens["access_token"]

    refreshed = await svc.refresh(tokens["refresh_token"], client_type="guest")
    assert refreshed["access_token"]
    assert refreshed["refresh_token"]  # fallback se original wapas


@pytest.mark.asyncio
async def test_wrong_password_generic_401(cognito_env):
    """User enumeration guard: ghalat password ho ya ghalat email — same message."""
    from src.services.cognito_auth_service import CognitoAuthService

    svc = CognitoAuthService()
    await svc.signup_guest("real@test.com", "GuestPass123!")
    with pytest.raises(UnauthorizedError) as e1:
        await svc.login("real@test.com", "WrongPass123!")
    with pytest.raises(UnauthorizedError) as e2:
        await svc.login("ghost@test.com", "GuestPass123!")
    assert e1.value.message == e2.value.message == "Invalid credentials"


@pytest.mark.asyncio
async def test_bad_refresh_token_401(cognito_env):
    from src.services.cognito_auth_service import CognitoAuthService

    with pytest.raises(UnauthorizedError):
        await CognitoAuthService().refresh("garbage-refresh-token")