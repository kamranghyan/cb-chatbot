"""
Bedrock embeddings — old CohereV3Bedrock ka replacement. model_id .env se
aata hai (cohere.embed-multilingual-v3, amazon.titan-embed-text-v2:0, ...),
region hardcode nahi (old code mein us-east-1 baked tha).
"""

from langchain_aws import BedrockEmbeddings
from langchain_core.embeddings import Embeddings

from src.config import get_settings
from src.rag.embed.base import EmbeddingProvider, register_embedder


@register_embedder("bedrock_cohere")   # backward-compat naam
@register_embedder("bedrock")          # generic naam — dono same class
class BedrockEmbeddingProvider(EmbeddingProvider):
    def get_embeddings(self, model_id: str, **kwargs) -> Embeddings:
        s = get_settings()
        return BedrockEmbeddings(model_id=model_id, region_name=s.BEDROCK_REGION)