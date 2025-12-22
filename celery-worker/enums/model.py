from enum import Enum
from typing import NamedTuple

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

class OfficialModel(Enum):
    llm = ModelMeta(
        id="7dc12cdb183b49e199d2651f997db272",
        title="gpt-5.2",
        description="gpt-5.2"
    )
    @property
    def meta(self) -> ModelMeta:
        return self.value