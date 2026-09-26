"""
Voice-to-text service — faster-whisper (CTranslate2), CPU, int8 quantized.
Multilingual (auto-detects language per request — Urdu/English/mixed all
handled by the same "small" multilingual model, no separate config needed).

Model loads once (lazy singleton) and is reused across requests — loading
it per-request would be far too slow (~1-2s init cost each time).
"""

import asyncio
import logging
from functools import lru_cache

from faster_whisper import WhisperModel

from src.config import get_settings

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_model() -> WhisperModel:
    """
    Loaded once, kept in memory for the process lifetime.
    int8 compute_type keeps this usable alongside the Ollama LLM on
    CPU-only hosts — full float32 would be noticeably heavier.
    """
    settings = get_settings()
    model_size = getattr(settings, "WHISPER_MODEL_SIZE", "small")
    log.info("Loading faster-whisper model: %s (int8, CPU)", model_size)
    return WhisperModel(model_size, device="cpu", compute_type="int8")


async def transcribe(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    """
    Transcribes raw audio bytes (webm/ogg/wav/mp3 — anything ffmpeg can
    decode, since faster-whisper shells out to it internally).

    Runs the blocking faster-whisper call in a thread so it doesn't block
    the event loop (same pattern as the existing S3/boto3 calls in this
    codebase — asyncio.to_thread).

    Returns {"text": str, "language": str, "language_probability": float}
    """
    import io

    model = _get_model()

    def _run() -> tuple[str, str, float]:
        segments, info = model.transcribe(
            io.BytesIO(audio_bytes),
            beam_size=5,
            vad_filter=True,  # trims silence — faster + fewer hallucinated tokens on quiet clips
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return text, info.language, info.language_probability

    text, language, language_probability = await asyncio.to_thread(_run)

    return {
        "text": text,
        "language": language,
        "language_probability": round(language_probability, 3),
    }