from typing import NamedTuple

from base_implement.engine_base import EngineBase


class STTCapability(NamedTuple):
    """Static declaration of what an STT engine can produce.

    - ``segments``: per-utterance timestamps (required to enable meeting mode)
    - ``diarization``: speaker labels on each segment (meeting mode degrades to
      a single speaker when this is False)
    - ``max_audio_seconds``: hard limit on audio length, ``None`` means no limit
    """

    segments: bool = False
    diarization: bool = False
    max_audio_seconds: int | None = None


class Segment(NamedTuple):
    """A single transcript utterance. ``start`` / ``end`` are in seconds."""

    start: float
    end: float
    speaker: str | None
    text: str


class TranscribeResult(NamedTuple):
    """Unified STT output. ``segments`` is None unless ``with_segments`` was requested
    and the engine supports it."""

    text: str
    segments: list[Segment] | None = None


class STTEngineBase(EngineBase):

    # Declared by each concrete engine class; readable without instantiation.
    CAPABILITY: STTCapability = STTCapability()

    async def transcribe_audio(
        self,
        audio_file_name: str,
        *,
        with_segments: bool = False,
    ) -> TranscribeResult:
        raise NotImplementedError("Method not implemented")
