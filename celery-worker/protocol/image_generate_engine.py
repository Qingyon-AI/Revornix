from protocol.engine import EngineProtocol

class ImageGenerateEngineProtocol(EngineProtocol):
    def generate_image(
        self, 
        prompt: str
    ) -> str:
        raise NotImplementedError("Method not implemented")