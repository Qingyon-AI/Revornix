from enum import Enum, IntEnum
from typing import NamedTuple


class UserEngineRole(IntEnum):
    CREATOR = 0
    FORKER = 1

class EngineCategory(IntEnum):
    Markdown = 0
    TTS = 1
    IMAGE = 2

class EngineMeta(NamedTuple):
    uuid: str
    name: str
    category: EngineCategory

class Engine(Enum):
    MinerU = EngineMeta(
        uuid='c59151aa86784d9ab52f74c12c830b1f',
        name='MinerU',
        category=EngineCategory.Markdown
    )
    MinerU_API = EngineMeta(
        uuid='d90eabd6ce9e42da98ba6168cb189b70',
        name='MinerU_API',
        category=EngineCategory.Markdown
    )
    MarkitDown = EngineMeta(
        uuid='9188ddca93ff4c2bb97fa252723c6c13',
        name='MarkitDown',
        category=EngineCategory.Markdown
    )
    Jina = EngineMeta(
        uuid='e31849ffa7f84a2cb4e2fa2ea00f25d2',
        name='Jina',
        category=EngineCategory.Markdown
    )
    OpenAI_TTS = EngineMeta(
        uuid='142d5cc7db8c42d0bc1ad1f24d4b6cd4',
        name='OpenAI_TTS',
        category=EngineCategory.TTS
    )
    Volc_TTS = EngineMeta(
        uuid='f2286c251b0b4650b60b6b9b48ea3cce',
        name='Volc_TTS',
        category=EngineCategory.TTS
    )
    Banana_Image = EngineMeta(
        uuid='9f1fb0005a99483da191a38af6dc7a23',
        name='Banana_Image',
        category=EngineCategory.IMAGE
    )
    Official_Volc_TTS = EngineMeta(
        uuid='4ece6490f8ef4132bf30a7ca72250d56',
        name='Official_Volc_TTS',
        category=EngineCategory.TTS
    )
    Official_Banana_Image = EngineMeta(
        uuid='3867d20a8e24484da42f8a1f04bece87',
        name='Official_Banana_Image',
        category=EngineCategory.IMAGE
    )
    @property
    def meta(self) -> EngineMeta:
        return self.value
