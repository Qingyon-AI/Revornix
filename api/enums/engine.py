from enum import Enum, IntEnum

class EngineUUID(Enum):
    MinerU = 'c59151aa86784d9ab52f74c12c830b1f'
    MinerU_API = 'd90eabd6ce9e42da98ba6168cb189b70'
    MarkitDown = '9188ddca93ff4c2bb97fa252723c6c13'
    Jina = 'e31849ffa7f84a2cb4e2fa2ea00f25d2'
    
    Volc_TTS = 'f2286c251b0b4650b60b6b9b48ea3cce'
    
class EngineCategory(IntEnum):
    Markdown = 0
    TTS = 1