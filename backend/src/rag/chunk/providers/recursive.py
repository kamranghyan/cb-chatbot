"""
Recursive chunker — default. MAX_CHUNK_SIZE/CHUNK_OVERLAP .env se
(old system mein yeh SSM params the lekin inhe use karne wali in-app
pipeline exist hi nahi karti thi — Bedrock KB ko delegated tha).
"""

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.config import get_settings
from src.rag.chunk.base import Chunker, register_chunker


@register_chunker("recursive")
class RecursiveChunker(Chunker):
    def __init__(self):
        s = get_settings()
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=s.MAX_CHUNK_SIZE,
            chunk_overlap=s.CHUNK_OVERLAP,
            add_start_index=True,  # metadata mein chunk ka source-offset
        )

    def chunk(self, docs: list[Document]) -> list[Document]:
        return self._splitter.split_documents(docs)