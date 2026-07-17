"""Provider registry tests — multi-model requirement ka core."""

import pytest

import src.rag.factory  # noqa: F401 — providers register karta hai
from src.rag.embed.base import get_embedding_provider
from src.rag.llm.base import get_llm_provider
from src.rag.vectorstore.base import SearchFilter, get_vectorstore_provider
from src.rag.vectorstore.providers.pgvector import _to_pg_filter


def test_all_expected_providers_registered():
    for name in ("bedrock", "sagemaker", "ollama", "fake"):
        assert get_llm_provider(name)
    for name in ("bedrock", "ollama", "fake"):
        assert get_embedding_provider(name)
    for name in ("pgvector", "bedrock_kb"):
        assert get_vectorstore_provider(name)


def test_unknown_provider_raises():
    with pytest.raises(KeyError):
        get_llm_provider("gpt-99")


def test_rbac_filter_mapping():
    f = SearchFilter(security_levels=["public", "private"], department_id="5")
    pg = _to_pg_filter(f)
    assert pg == {"security_level": {"$in": ["public", "private"]}, "department_id": {"$eq": "5"}}
    assert _to_pg_filter(None) is None
    assert _to_pg_filter(SearchFilter()) is None