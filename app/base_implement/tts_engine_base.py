from dataclasses import dataclass, field
from typing import Any

from base_implement.engine_base import EngineBase


@dataclass
class TTSSynthesisResult:
    audio_bytes: bytes
    script_text: str | None = None
    script_segments: list[dict[str, Any]] = field(default_factory=list)


class TTSEngineBase(EngineBase):

    async def synthesize(
        self,
        text: str
    ) -> TTSSynthesisResult:
        raise NotImplementedError("Method not implemented")
