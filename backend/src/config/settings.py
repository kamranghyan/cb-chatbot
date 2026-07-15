"""
Single source of truth for configuration.

Old system: 300-line config.py, SSM import-time pe, .env support zero,
local password hardcoded. Naya system: har cheez typed field, priority:

    init kwargs > OS env > .env > SSM fallback > default

Usage:
    from src.config import get_settings
    settings = get_settings()          # cached singleton
    settings.database_url              # computed property
"""

from functools import lru_cache

from pydantic import computed_field
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict

from src.config.ssm_source import SsmSettingsSource


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App ----
    ENV: str = "local"
    DEBUG: bool = False
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    SSM_FALLBACK: bool = False
    AWS_DEFAULT_REGION: str = "us-east-1"

    # ---- Database ----
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "ragdb"

    # ---- Redis ----
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # ---- Auth ----
    JWT_SECRET_KEY: str = "insecure-default-change-me"
    JWT_ALGORITHM: str = "HS256"

    # ---- RAG providers (factory in selection pe adapter choose karti hai) ----
    LLM_PROVIDER: str = "bedrock"
    LLM_MODEL_ID: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    EMBED_PROVIDER: str = "bedrock_cohere"
    EMBED_MODEL_ID: str = "cohere.embed-multilingual-v3"
    VECTORSTORE_PROVIDER: str = "pgvector"
    EMBEDDINGS_COLLECTION: str = "cb-netflix_embeddings"

    MAX_CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    ENABLE_CHAT_MEMORY: bool = True
    CHAT_HISTORY_NO_OF_MSGS: int = 5

    # ---- Bedrock KB path ----
    KNOWLEDGE_BASE_ID: str = ""
    KB_DATASOURCE_ID: str = ""
    BEDROCK_REGION: str = "us-east-1"

    # ---- S3 ----
    S3_BUCKET: str = ""

    # ---- LangSmith ----
    LANGSMITH_TRACING: bool = False
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "cb-netflix-local"

    # ---- Integrations ----
    SENDGRID_API_KEY: str = ""

    # ---- Computed ----
    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sync_database_url(self) -> str:
        """Alembic / langchain-postgres (psycopg) ke liye."""
        return (
            f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def redis_url(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def is_local(self) -> bool:
        return self.ENV.lower() == "local"

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        # Order = priority (pehla sab se strong). SSM sab se aakhir mein
        # => sirf woh values bharta hai jo upar kahin nahi mili.
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            SsmSettingsSource(settings_cls),
            file_secret_settings,
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
