from api.base_implement.engine_base import EngineBase


class TTSEngineBase(EngineBase):

    async def synthesize(
        self,
        text: str
    ):
        raise NotImplementedError("Method not implemented")
