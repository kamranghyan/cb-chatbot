"""
CAG tests — S3 warm-load, Redis caching, context selection, tenant isolation.
Follows test_auth_flows.py's moto pattern for S3; Redis is faked in-memory
since no Redis test double exists elsewhere in the repo yet.
"""

import boto3
import pytest
from moto import mock_aws

from src.config import get_settings
from src.rag.vectorstore.base import SearchFilter
from src.rag.vectorstore.providers.pgvector import _to_pg_filter

REGION = "ap-south-1"
BUCKET = "test-cag-bucket"


# ---------- fakes ----------

class FakeRedis:
    """Implements only what cag_cache.py calls: get/set/sadd/smembers/delete."""

    def __init__(self):
        self._store: dict[str, str] = {}
        self._sets: dict[str, set] = {}

    async def get(self, key):
        return self._store.get(key)

    async def set(self, key, value):
        self._store[key] = value

    async def sadd(self, key, value):
        self._sets.setdefault(key, set()).add(value)

    async def smembers(self, key):
        return self._sets.get(key, set())

    async def delete(self, *keys):
        for k in keys:
            self._store.pop(k, None)
            self._sets.pop(k, None)


@pytest.fixture
def fake_redis(monkeypatch):
    import src.infrastructure.cache.cag_cache as cag_cache_mod

    fake = FakeRedis()
    monkeypatch.setattr(cag_cache_mod, "get_redis", lambda: fake)
    yield fake


@pytest.fixture
def s3_env(monkeypatch):
    with mock_aws():
        client = boto3.client("s3", region_name=REGION)
        client.create_bucket(
            Bucket=BUCKET, CreateBucketConfiguration={"LocationConstraint": REGION}
        )
        monkeypatch.setenv("S3_BUCKET", BUCKET)
        monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)
        get_settings.cache_clear()
        yield client
        get_settings.cache_clear()


def _put_md(client, brand_id: str, filename: str, content: str):
    client.put_object(
        Bucket=BUCKET, Key=f"clients/{brand_id}/cag/{filename}", Body=content.encode("utf-8")
    )


# ---------- cag_s3 ----------

@pytest.mark.asyncio
async def test_discover_and_list_tenant_docs(s3_env):
    from src.rag.ingest.providers import cag_s3

    _put_md(s3_env, "5", "faq.md", "# FAQ\nAnswer text.")
    _put_md(s3_env, "5", "pricing.md", "# Pricing\nDetails.")
    _put_md(s3_env, "6", "faq.md", "# Tenant 6 FAQ")

    tenants = await cag_s3.discover_tenant_ids()
    assert set(tenants) == {"5", "6"}

    docs_5 = await cag_s3.list_tenant_docs("5")
    assert len(docs_5) == 2
    assert all(k.startswith("clients/5/cag/") for k in docs_5)


@pytest.mark.asyncio
async def test_load_doc_content(s3_env):
    from src.rag.ingest.providers import cag_s3

    _put_md(s3_env, "5", "faq.md", "hello world")
    content = await cag_s3.load_doc("clients/5/cag/faq.md")
    assert content == "hello world"


@pytest.mark.asyncio
async def test_discover_empty_bucket_returns_empty(s3_env):
    from src.rag.ingest.providers import cag_s3

    assert await cag_s3.discover_tenant_ids() == []


# ---------- cag_cache ----------

@pytest.mark.asyncio
async def test_cache_set_get_roundtrip(fake_redis):
    from src.infrastructure.cache import cag_cache

    await cag_cache.set_doc("5", "faq", "content here")
    assert await cag_cache.get_doc("5", "faq") == "content here"
    assert await cag_cache.list_doc_ids("5") == ["faq"]


@pytest.mark.asyncio
async def test_cache_tenant_isolation(fake_redis):
    """Core Test 6 requirement: tenant 5's cache must never leak into tenant 6's read."""
    from src.infrastructure.cache import cag_cache

    await cag_cache.set_doc("5", "secret", "tenant 5 only")
    await cag_cache.set_doc("6", "other", "tenant 6 only")

    docs_5 = await cag_cache.get_all_docs("5")
    docs_6 = await cag_cache.get_all_docs("6")

    assert "secret" in docs_5 and "secret" not in docs_6
    assert "other" in docs_6 and "other" not in docs_5


@pytest.mark.asyncio
async def test_clear_tenant_only_affects_that_tenant(fake_redis):
    from src.infrastructure.cache import cag_cache

    await cag_cache.set_doc("5", "a", "x")
    await cag_cache.set_doc("6", "b", "y")

    await cag_cache.clear_tenant("5")

    assert await cag_cache.get_all_docs("5") == {}
    assert await cag_cache.get_all_docs("6") == {"b": "y"}


# ---------- cag_service: warm-load (S3 -> Redis) ----------

@pytest.mark.asyncio
async def test_warm_load_tenant_populates_cache(s3_env, fake_redis):
    from src.services.cag_service import warm_load_tenant
    from src.infrastructure.cache import cag_cache

    _put_md(s3_env, "5", "faq.md", "FAQ content")
    _put_md(s3_env, "5", "pricing.md", "Pricing content")

    count = await warm_load_tenant("5")
    assert count == 2

    docs = await cag_cache.get_all_docs("5")
    assert set(docs.keys()) == {"faq", "pricing"}


@pytest.mark.asyncio
async def test_warm_load_all_covers_every_tenant(s3_env, fake_redis):
    from src.services.cag_service import warm_load_all
    from src.infrastructure.cache import cag_cache

    _put_md(s3_env, "5", "faq.md", "tenant 5 content")
    _put_md(s3_env, "6", "faq.md", "tenant 6 content")

    await warm_load_all()

    assert await cag_cache.get_doc("5", "faq") == "tenant 5 content"
    assert await cag_cache.get_doc("6", "faq") == "tenant 6 content"


@pytest.mark.asyncio
async def test_redis_rebuild_after_flush(s3_env, fake_redis):
    """Simulates Test 4/5: Redis wiped, S3 untouched, warm-load rebuilds it."""
    from src.services.cag_service import warm_load_tenant
    from src.infrastructure.cache import cag_cache

    _put_md(s3_env, "5", "faq.md", "durable content")
    await warm_load_tenant("5")
    assert await cag_cache.get_doc("5", "faq") == "durable content"

    # simulate Redis loss
    fake_redis._store.clear()
    fake_redis._sets.clear()
    assert await cag_cache.get_all_docs("5") == {}

    # rebuild from S3 (still intact — never touched)
    await warm_load_tenant("5")
    assert await cag_cache.get_doc("5", "faq") == "durable content"


# ---------- cag_service: context selection ----------

@pytest.mark.asyncio
async def test_select_context_returns_relevant_doc(fake_redis):
    from src.services.cag_service import select_context
    from src.infrastructure.cache import cag_cache

    await cag_cache.set_doc("5", "faq", "We support agentic AI workflows for customer support.")
    await cag_cache.set_doc("5", "pricing", "Enterprise plan costs nine thousand dollars monthly.")

    selected = await select_context("what are agentic AI workflows", "5")
    assert "faq" in selected
    assert "pricing" not in selected


@pytest.mark.asyncio
async def test_select_context_no_match_returns_empty(fake_redis):
    """Core requirement: don't blindly dump unrelated cached docs."""
    from src.services.cag_service import select_context
    from src.infrastructure.cache import cag_cache

    await cag_cache.set_doc("5", "faq", "We support agentic AI workflows.")

    selected = await select_context("completely unrelated topic xyz", "5")
    assert selected == {}


@pytest.mark.asyncio
async def test_select_context_empty_cache_returns_empty(fake_redis):
    from src.services.cag_service import select_context

    selected = await select_context("any question", "nonexistent-tenant")
    assert selected == {}


# ---------- context_builder ----------

def test_build_rag_context_matches_existing_inline_format():
    """Must stay byte-for-byte identical to the pre-refactor inline join."""
    from src.rag.vectorstore.base import ScoredDocument
    from langchain_core.documents import Document
    from src.services.context_builder import build_rag_context

    docs = [
        ScoredDocument(document=Document(page_content="chunk one"), score=0.9),
        ScoredDocument(document=Document(page_content="chunk two"), score=0.8),
    ]
    assert build_rag_context(docs) == "chunk one\n\n---\n\nchunk two"


def test_build_rag_context_empty_docs():
    from src.services.context_builder import build_rag_context

    assert build_rag_context([]) == "No context found."


def test_merge_labels_both_sources():
    from src.services.context_builder import merge

    result = merge("cag stuff", "rag stuff")
    assert "cag stuff" in result and "rag stuff" in result
    assert "Prepared" in result and "Retrieved" in result


def test_merge_empty_both_returns_no_context():
    from src.services.context_builder import merge

    assert merge("", "No context found.") == "No context found."


def test_merge_truncates_over_budget():
    from src.services.context_builder import merge, MAX_CONTEXT_CHARS

    huge = "x" * (MAX_CONTEXT_CHARS + 500)
    result = merge(huge, "")
    assert len(result) <= MAX_CONTEXT_CHARS + len("\n\n[...truncated]") + 50
    assert "[...truncated]" in result


# ---------- brand_id filter fix (item 1) ----------

def test_rbac_filter_includes_brand_id():
    f = SearchFilter(security_levels=["public"], brand_id="1")
    pg = _to_pg_filter(f)
    assert pg["brand_id"] == {"$eq": "1"}


def test_rbac_filter_brand_id_none_omitted():
    f = SearchFilter(security_levels=["public"])
    pg = _to_pg_filter(f)
    assert "brand_id" not in pg