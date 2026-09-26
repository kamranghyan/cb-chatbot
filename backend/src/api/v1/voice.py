"""
Voice routes — speech-to-text via faster-whisper.

    POST /api/v1/voice/transcribe   multipart audio upload -> transcribed text

Kept as its own router (mirrors the cag_ingest.py / cag_debug.py pattern in
this codebase) — doesn't touch chat.py or ingestion.py at all.
"""

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from src.core.auth import RequireUser
from src.services.voice_service import transcribe

log = logging.getLogger(__name__)

router = APIRouter()

MAX_AUDIO_BYTES = 15 * 1024 * 1024  # 15MB — generous for a few minutes of speech


@router.post("/transcribe")
async def voice_transcribe(ctx: RequireUser, file: UploadFile = File(...)):
    """
    Accepts a single audio clip (webm/ogg/wav/mp3 — whatever the browser's
    MediaRecorder produced) and returns the transcribed text.

    Frontend is expected to drop the returned text into the chat input box
    for the user to review/edit before sending — this endpoint only
    transcribes, it does not itself call the chat pipeline.
    """
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Audio file too large (max 15MB)")

    try:
        result = await transcribe(data, filename=file.filename or "audio.webm")
    except Exception as e:
        log.exception("Transcription failed")
        raise HTTPException(status_code=500, detail="Transcription failed") from e

    if not result["text"]:
        raise HTTPException(status_code=422, detail="Could not detect any speech in the audio")

    return result