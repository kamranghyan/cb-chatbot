"""Config priority chain tests — env > .env > default."""

import os

from src.config.settings import Settings


def test_defaults():
    s = Settings(_env_file=None)
    assert s.ENV == "local"
    assert s.DB_PORT == 5432


def test_os_env_wins(monkeypatch):
    monkeypatch.setenv("DB_PORT", "9999")
    s = Settings(_env_file=None)
    assert s.DB_PORT == 9999


def test_database_url_computed():
    s = Settings(_env_file=None, DB_USER="u", DB_PASSWORD="p", DB_HOST="h", DB_NAME="d")
    assert s.database_url == "postgresql+asyncpg://u:p@h:5432/d"