from protocol.engine import EngineProtocol

class TTSEngineProtocol(EngineProtocol):
    
    async def synthesize(self, input_url: str):
        raise NotImplementedError("Method not implemented")