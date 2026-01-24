from base_implement.engine_base import EngineBase


class STTEngineBase(EngineBase):

    async def transcribe_audio(
        self,
        audio_file_name: str
    ):
        raise NotImplementedError("Method not implemented")
