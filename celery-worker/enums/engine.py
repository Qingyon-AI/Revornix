from enum import Enum, IntEnum

class EngineUUID(Enum):
    MinerU = 'c59151aa86784d9ab52f74c12c830b1f'
    MinerU_API = 'd90eabd6ce9e42da98ba6168cb189b70'
    MarkitDown = '9188ddca93ff4c2bb97fa252723c6c13'
    Jina = 'e31849ffa7f84a2cb4e2fa2ea00f25d2'
    
    Volc_TTS = 'f2286c251b0b4650b60b6b9b48ea3cce'
    OpenAI_TTS = '142d5cc7db8c42d0bc1ad1f24d4b6cd4'
    
    Banana_Image = '9f1fb0005a99483da191a38af6dc7a23'
    
class EngineCategory(IntEnum):
    Markdown = 0
    TTS = 1
    IMAGE = 2