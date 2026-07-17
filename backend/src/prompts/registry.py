"""
Prompt registry — old system har request pe S3 se prompt download karta tha
(latency + cost + no version control). Ab:

  1. Prompts repo mein version-controlled (templates/*.txt)
  2. S3 override OPTIONAL hai (S3_BUCKET set ho to prompts/{name}.txt check
     hota hai) — business team code deploy ke bagair prompt tweak kar sakti hai
  3. TTL cache — S3 hit har request pe nahi, 5 minute mein max ek dafa
"""

import logging
import time
from pathlib import Path

from src.config import get_settings

log = logging.getLogger(__name__)

_TEMPLATES_DIR = Path(__file__).parent / "templates"
_CACHE_TTL_SECONDS = 300

_cache: dict[str, tuple[str, float]] = {}  # name -> (text, fetched_at)


def get_prompt(name: str) -> str:
    now = time.time()
    if name in _cache and now - _cache[name][1] < _CACHE_TTL_SECONDS:
        return _cache[name][0]

    text = _try_s3(name) or _from_local(name)
    _cache[name] = (text, now)
    return text


def _from_local(name: str) -> str:
    path = _TEMPLATES_DIR / f"{name}.txt"
    if not path.exists():
        raise KeyError(f"Prompt '{name}' not found at {path}")
    return path.read_text(encoding="utf-8")


def _try_s3(name: str) -> str | None:
    s = get_settings()
    if not s.S3_BUCKET:
        return None
    try:
        import boto3

        obj = boto3.client("s3").get_object(Bucket=s.S3_BUCKET, Key=f"prompts/{name}.txt")
        return obj["Body"].read().decode("utf-8")
    except Exception:
        return None  # S3 override optional hai — fail-soft to local