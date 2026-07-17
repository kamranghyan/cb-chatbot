"""
Bedrock chat provider — old BedrockLlm (deprecated langchain Bedrock/BedrockChat
+ manual Claude-v2 vs Claude-3 if/else) ka replacement.

ChatBedrockConverse AWS ke unified Converse API pe hai: Claude, Llama, Mistral,
Titan — sab isi se chalte hain, koi model-specific branching nahi. Streaming
(.astream) built-in — Phase 4 isi pe chalega.
"""

from langchain_aws import ChatBedrockConverse
from langchain_core.language_models import BaseLanguageModel

from src.config import get_settings
from src.rag.llm.base import LLMProvider, register_llm


@register_llm("bedrock")
class BedrockLLMProvider(LLMProvider):
    def get_model(self, model_id: str, **kwargs) -> BaseLanguageModel:
        s = get_settings()
        return ChatBedrockConverse(
            model=model_id,
            region_name=s.BEDROCK_REGION,
            temperature=kwargs.get("temperature", 0.0),
            max_tokens=kwargs.get("max_tokens", 2048),
        )