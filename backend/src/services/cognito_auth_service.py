"""
Cognito auth flows — signup / login / refresh.

Guest flytime flow (tumhari requirement):
    signup -> auto-confirm -> guest-user group -> AUTO-LOGIN -> tokens
    (user seedha chat pe — login screen skip; 60 min baad Cognito khud
    token maar dega -> 401 -> re-login. Flytime AWS-controlled.)

Sab boto3 calls asyncio.to_thread mein (sync SDK, event loop block na ho).
Auth errors fail-closed: generic "Invalid credentials" — user enumeration
attack se bachne ke liye hum yeh nahi batate ke email ghalat tha ya password.
"""

import asyncio
import logging
from http import HTTPStatus

import boto3
from botocore.exceptions import ClientError

from src.config import get_settings
from src.core.exceptions import AppException, UnauthorizedError

log = logging.getLogger(__name__)

GUEST_GROUP = "guest-user"


class CognitoAuthService:
    def __init__(self):
        s = get_settings()
        self._client = boto3.client("cognito-idp", region_name=s.COGNITO_REGION)
        self._pool_id = s.COGNITO_USER_POOL_ID
        self._main_client_id = s.COGNITO_CLIENT_ID
        self._guest_client_id = s.COGNITO_GUEST_CLIENT_ID

    def _client_id_for(self, client_type: str) -> str:
        return self._guest_client_id if client_type == "guest" else self._main_client_id

    # ---------- signup (guest flytime flow) ----------

    async def signup_guest(self, email: str, password: str) -> dict:
        try:
            await asyncio.to_thread(
                self._client.sign_up,
                ClientId=self._guest_client_id,
                Username=email,
                Password=password,
                UserAttributes=[{"Name": "email", "Value": email}],
            )
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code == "UsernameExistsException":
                raise AppException(HTTPStatus.CONFLICT, "Account already exists — please log in")
            if code == "InvalidPasswordException":
                raise AppException(HTTPStatus.BAD_REQUEST, e.response["Error"]["Message"])
            log.warning("signup failed: %s", e)
            raise AppException(HTTPStatus.BAD_REQUEST, "Signup failed")

        # auto-confirm + guest group (admin APIs — isi liye signup backend se
        # hota hai, frontend direct Cognito se nahi kar sakta yeh do steps)
        await asyncio.to_thread(
            self._client.admin_confirm_sign_up, UserPoolId=self._pool_id, Username=email
        )
        await asyncio.to_thread(
            self._client.admin_add_user_to_group,
            UserPoolId=self._pool_id, Username=email, GroupName=GUEST_GROUP,
        )

        # auto-login: signup response mein hi tokens -> seedha chat
        return await self.login(email, password, client_type="guest")

    # ---------- login ----------

    async def login(self, email: str, password: str, client_type: str = "main") -> dict:
        try:
            resp = await asyncio.to_thread(
                self._client.initiate_auth,
                ClientId=self._client_id_for(client_type),
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={"USERNAME": email, "PASSWORD": password},
            )
        except ClientError as e:
            log.info("login failed for %s: %s", email, e.response["Error"]["Code"])
            raise UnauthorizedError("Invalid credentials")

        if resp.get("ChallengeName"):
            # e.g. NEW_PASSWORD_REQUIRED (admin-created user, temp password)
            raise AppException(
                HTTPStatus.FORBIDDEN,
                f"Additional step required: {resp['ChallengeName']}",
                "AUTH_CHALLENGE",
            )
        return self._tokens(resp)

    # ---------- refresh ----------

    async def refresh(self, refresh_token: str, client_type: str = "main") -> dict:
        try:
            resp = await asyncio.to_thread(
                self._client.initiate_auth,
                ClientId=self._client_id_for(client_type),
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters={"REFRESH_TOKEN": refresh_token},
            )
        except ClientError:
            raise UnauthorizedError("Session expired — please log in again")
        return self._tokens(resp, refresh_fallback=refresh_token)

    @staticmethod
    def _tokens(resp: dict, refresh_fallback: str | None = None) -> dict:
        r = resp["AuthenticationResult"]
        return {
            "access_token": r["AccessToken"],
            "refresh_token": r.get("RefreshToken", refresh_fallback),
            "expires_in": r["ExpiresIn"],
            "token_type": "bearer",
        }