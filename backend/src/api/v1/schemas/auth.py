"""Auth schemas (Cognito endpoints)."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    client_type: Literal["main", "guest"] = "main"


class RefreshIn(BaseModel):
    refresh_token: str
    client_type: Literal["main", "guest"] = "main"


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_in: int
    token_type: str = "bearer"