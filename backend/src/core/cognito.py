"""
Cognito token verification — JWKS based.

Kaise kaam karta hai:
  1. Cognito tokens RS256 (public/private key) se sign hote hain — hamari
     JWT_SECRET_KEY jaisi shared secret NAHI hoti.
  2. Pool ka public JWKS ek dafa fetch ho kar cache hota hai (12h TTL) —
     har request pe AWS call NAHI jati, verification pure-local hai.
  3. Access token verify: signature + issuer (pool) + expiry + client_id
     (main YA guest client — dono accept). ID token aya ho to aud check.
  4. cognito:groups claim -> internal role (mapping .env se, code se nahi).

Fail-closed: verification ka koi bhi step fail -> UnauthorizedError.
(Auth mein fail-open kabhi nahi — yeh cache/rate-limit nahi hai.)
"""

import json
import logging
import time

import httpx
from jose import JWTError, jwt

from src.config import get_settings
from src.core.exceptions import UnauthorizedError
from src.domain.enums import ROLE_NAME_TO_ID, RoleId

log = logging.getLogger(__name__)

_JWKS_TTL_SECONDS = 12 * 3600
_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}


def _issuer() -> str:
    s = get_settings()
    return f"https://cognito-idp.{s.COGNITO_REGION}.amazonaws.com/{s.COGNITO_USER_POOL_ID}"


async def _get_jwks() -> list[dict]:
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL_SECONDS:
        return _jwks_cache["keys"]

    url = f"{_issuer()}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        _jwks_cache["keys"] = resp.json()["keys"]
        _jwks_cache["fetched_at"] = now
        log.info("JWKS refreshed (%d keys)", len(_jwks_cache["keys"]))
        return _jwks_cache["keys"]


async def verify_cognito_token(token: str) -> dict:
    """Token verify karo, claims wapas do. Har failure -> UnauthorizedError."""
    s = get_settings()
    try:
        kid = jwt.get_unverified_header(token).get("kid")
    except JWTError as e:
        raise UnauthorizedError(f"Malformed token: {e}")

    keys = await _get_jwks()
    key = next((k for k in keys if k["kid"] == kid), None)
    if key is None:
        # Key rotation case: cache purana ho sakta hai — ek dafa force refresh
        _jwks_cache["fetched_at"] = 0.0
        keys = await _get_jwks()
        key = next((k for k in keys if k["kid"] == kid), None)
        if key is None:
            raise UnauthorizedError("Unknown signing key")

    try:
        claims = jwt.decode(
            token, key, algorithms=["RS256"], issuer=_issuer(),
            options={"verify_aud": False},  # aud manually (access tokens mein aud nahi hota)
        )
    except JWTError as e:
        raise UnauthorizedError(f"Token verification failed: {e}")

    allowed_clients = {c for c in (s.COGNITO_CLIENT_ID, s.COGNITO_GUEST_CLIENT_ID) if c}
    token_use = claims.get("token_use")
    if token_use == "access":
        if claims.get("client_id") not in allowed_clients:
            raise UnauthorizedError("Token is not for this application")
    elif token_use == "id":
        if claims.get("aud") not in allowed_clients:
            raise UnauthorizedError("Token is not for this application")
    else:
        raise UnauthorizedError("Unsupported token type")

    return claims


def map_groups_to_role(groups: list[str]) -> int:
    """cognito:groups -> internal RoleId. Mapping .env se — group rename
    pe sirf env badlegi. Multiple groups ho to sab se powerful jeeta hai."""
    s = get_settings()
    try:
        mapping: dict[str, str] = json.loads(s.COGNITO_GROUP_ROLE_MAP)
    except json.JSONDecodeError:
        log.error("COGNITO_GROUP_ROLE_MAP invalid JSON — defaulting all to GUEST")
        mapping = {}

    role_ids = [
        ROLE_NAME_TO_ID[mapping[g]]
        for g in groups
        if g in mapping and mapping[g] in ROLE_NAME_TO_ID
    ]
    if not role_ids:
        return RoleId.GUEST  # unknown/no group -> least privilege
    priority = [RoleId.ADMIN, RoleId.TENANT, RoleId.GUEST]
    return next(r for r in priority if r in role_ids)