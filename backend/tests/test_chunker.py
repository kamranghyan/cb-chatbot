"""Chunker tests — size/overlap respect + metadata preserve."""

from langchain_core.documents import Document

from src.rag.chunk.providers.recursive import RecursiveChunker


def test_chunks_respect_size():
    chunker = RecursiveChunker()
    docs = [Document(page_content="word " * 1000, metadata={"security_level": "public"})]
    chunks = chunker.chunk(docs)
    assert len(chunks) > 1
    assert all(len(c.page_content) <= 1000 for c in chunks)


def test_metadata_preserved_on_chunks():
    chunker = RecursiveChunker()
    docs = [Document(page_content="x " * 2000, metadata={"security_level": "secret"})]
    chunks = chunker.chunk(docs)
    assert all(c.metadata["security_level"] == "secret" for c in chunks)