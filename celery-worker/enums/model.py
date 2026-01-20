from enum import Enum, IntEnum
from typing import NamedTuple

class UserModelProviderRole(IntEnum):
    CREATOR = 0
    FORKER = 1

class ModelMeta(NamedTuple):
    id: str
    title: str
    description: str

class OfficialModelProvider(Enum):
    Revornix = ModelMeta(
        id="99fee36492ea41a78b79ee99bb3c1332",
        title="Revornix",
        description=(
            'Revornix-operated LLM gateway. '
            'Models are provided via Revornix-managed routing, '
            'including official and licensed upstream providers.'
        )
    )
    @property
    def meta(self) -> ModelMeta:
        return self.value
