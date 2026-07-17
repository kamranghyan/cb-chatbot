"""
SageMaker endpoint provider — old SageMakerLlm (JAIS content handler) ka port.
Request/response shape endpoint-specific hoti hai; yahan JAIS-style default hai,
naya endpoint aaye to sirf ContentHandler subclass karo.
"""

import json

from langchain_aws.llms import SagemakerEndpoint
from langchain_aws.llms.sagemaker_endpoint import LLMContentHandler
from langchain_core.language_models import BaseLanguageModel

from src.config import get_settings
from src.rag.llm.base import LLMProvider, register_llm


class JaisContentHandler(LLMContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompt: str, model_kwargs: dict) -> bytes:
        return json.dumps({"inputs": prompt, "parameters": model_kwargs}).encode("utf-8")

    def transform_output(self, output: bytes) -> str:
        data = json.loads(output.read().decode("utf-8"))
        if isinstance(data, list) and data:
            return data[0].get("generated_text", "")
        return data.get("generated_text", str(data))


@register_llm("sagemaker")
class SageMakerLLMProvider(LLMProvider):
    def get_model(self, model_id: str, **kwargs) -> BaseLanguageModel:
        # model_id yahan SageMaker endpoint ka naam hai
        s = get_settings()
        return SagemakerEndpoint(
            endpoint_name=model_id,
            region_name=s.AWS_DEFAULT_REGION,
            content_handler=JaisContentHandler(),
            model_kwargs={"temperature": kwargs.get("temperature", 0.0)},
        )