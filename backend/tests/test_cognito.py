"""
Cognito verifier tests — real RSA keypair + fake JWKS se, AWS ke bagair.
Verify hota hai: signature, issuer, expiry, client_id, token rejection,
groups->role mapping (priority + least-privilege default).
"""

import time

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt
from jose.backends.cryptography_backend import CryptographyRSAKey

import src.core.cognito as cognito
from src.core.cognito import map_groups_to_role, verify_cognito_token
from src.core.exceptions import UnauthorizedError
from src.domain.enums import RoleId

POOL_ID = "ap-south-1_TESTPOOL"
REGION = "ap-south-1"
MAIN_CLIENT = "main-client-id"
GUEST_CLIENT = "guest-client-id"


@pytest.fixture
def rsa_setup(monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk_priv = CryptographyRSAKey(private_key, "RS256").to_dict()
    jwk_pub = CryptographyRSAKey(private_key.public_key(), "RS256").to_dict()
    jwk_priv["kid"] = jwk_pub["kid"] = "test-kid-1"

    monkeypatch.setenv("AUTH_PROVIDER", "cognito")
    monkeypatch.setenv("COGNITO_USER_POOL_ID", POOL_ID)
    monkeypatch.setenv("COGNITO_REGION", REGION)
    monkeypatch.setenv("COGNITO_CLIENT_ID", MAIN_CLIENT)
    monkeypatch.setenv("COGNITO_GUEST_CLIENT_ID", GUEST_CLIENT)
    from src.config import get_settings
    get_settings.cache_clear()

    async def fake_jwks():
        return [jwk_pub]
    monkeypatch.setattr(cognito, "_get_jwks", fake_jwks)
    yield jwk_priv
    get_settings.cache_clear()


def make_token(key, *, client=MAIN_CLIENT, groups=None, exp_delta=3600, token_use="access", iss=None):
    claims = {
        "sub": "cognito-sub-123",
        "iss": iss or f"https://cognito-idp.{REGION}.amazonaws.com/{POOL_ID}",
        "exp": int(time.time()) + exp_delta,
        "token_use": token_use,
        "username": "user-uuid",
    }
    if token_use == "access":
        claims["client_id"] = client
    else:
        claims["aud"] = client
    if groups:
        claims["cognito:groups"] = groups
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": key["kid"]})


@pytest.mark.asyncio
async def test_valid_access_token(rsa_setup):
    token = make_token(rsa_setup, groups=["admin"])
    claims = await verify_cognito_token(token)
    assert claims["sub"] == "cognito-sub-123"
    assert claims["cognito:groups"] == ["admin"]


@pytest.mark.asyncio
async def test_guest_client_accepted(rsa_setup):
    claims = await verify_cognito_token(make_token(rsa_setup, client=GUEST_CLIENT))
    assert claims["client_id"] == GUEST_CLIENT


@pytest.mark.asyncio
async def test_wrong_client_rejected(rsa_setup):
    with pytest.raises(UnauthorizedError):
        await verify_cognito_token(make_token(rsa_setup, client="evil-client"))


@pytest.mark.asyncio
async def test_expired_token_rejected(rsa_setup):
    with pytest.raises(UnauthorizedError):
        await verify_cognito_token(make_token(rsa_setup, exp_delta=-60))


@pytest.mark.asyncio
async def test_wrong_issuer_rejected(rsa_setup):
    bad = f"https://cognito-idp.{REGION}.amazonaws.com/ap-south-1_EVIL"
    with pytest.raises(UnauthorizedError):
        await verify_cognito_token(make_token(rsa_setup, iss=bad))


@pytest.mark.asyncio
async def test_garbage_token_rejected(rsa_setup):
    with pytest.raises(UnauthorizedError):
        await verify_cognito_token("not.a.token")


def test_group_role_mapping(rsa_setup):
    assert map_groups_to_role(["admin"]) == RoleId.ADMIN
    assert map_groups_to_role(["tenant"]) == RoleId.TENANT
    assert map_groups_to_role(["guest-user"]) == RoleId.GUEST
    # multiple groups -> sab se powerful
    assert map_groups_to_role(["guest-user", "admin"]) == RoleId.ADMIN
    # unknown/khali -> least privilege
    assert map_groups_to_role(["random-group"]) == RoleId.GUEST
    assert map_groups_to_role([]) == RoleId.GUEST