from protocol.engine import EngineProtocol

class TTSEngineProtocol(EngineProtocol):
    
    async def synthesize(
        self, 
        text: str
    ):
        raise NotImplementedError("Method not implemented")