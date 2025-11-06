import json
from typing import Protocol

class TTSProtocol(Protocol):
    
    tts_uuid: str | None = None
    tts_name: str | None = None
    tts_name_zh: str | None = None
    tts_description: str | None = None
    tts_description_zh: str | None = None
    tts_demo_config: str | None = None
    tts_config: str | None = None
    
    def __init__(self, 
                 tts_uuid: str,
                 tts_name: str | None = None, 
                 tts_name_zh: str | None = None, 
                 tts_description: str | None = None, 
                 tts_description_zh: str | None = None, 
                 tts_demo_config: str | None = None, 
                 tts_config: str | None = None):
        self.tts_uuid = tts_uuid
        self.tts_name = tts_name
        self.tts_name_zh = tts_name_zh
        self.tts_description = tts_description
        self.tts_description_zh = tts_description_zh
        self.tts_demo_config = tts_demo_config
        self.tts_config = tts_config
    
    def get_tts_config(self) -> dict | None:
        if self.tts_config is not None:
            return json.loads(self.tts_config)
        return None
    
    async def synthesize(self, text: str):
        raise NotImplementedError("Method not implemented")