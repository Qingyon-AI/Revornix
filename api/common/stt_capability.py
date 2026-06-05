"""Helpers for inspecting STT engine capabilities without instantiating them.

Meeting-record mode requires an STT engine that can emit timestamped speaker
segments. Capability is declared statically as ``STTEngineBase.CAPABILITY`` on
each concrete engine class, so we can resolve the engine class from an engine id
and read the declaration without hitting the network or constructing the engine.
"""

from sqlalchemy.ext.asyncio import AsyncSession

import crud
from base_implement.stt_engine_base import STTCapability, STTEngineBase
from proxy.engine_proxy import EngineProxy


async def get_stt_engine_capability(
    *,
    db: AsyncSession,
    engine_id: int,
) -> STTCapability:
    """Resolve the static capability declaration for the given STT engine id.

    Raises if the engine does not exist or is not an STT engine.
    """
    db_engine_provided = await crud.engine.get_engine_provided_by_engine_id_async(
        db=db,
        engine_id=engine_id,
    )
    if db_engine_provided is None:
        raise Exception("The engine is not found")
    engine_cls = EngineProxy.resolve_engine_class(db_engine_provided.uuid)
    if not issubclass(engine_cls, STTEngineBase):
        raise Exception("The selected engine is not an STT engine")
    return engine_cls.CAPABILITY


async def engine_supports_meeting_mode(
    *,
    db: AsyncSession,
    engine_id: int,
) -> bool:
    """Whether the given STT engine can produce speaker-segmented transcripts."""
    capability = await get_stt_engine_capability(db=db, engine_id=engine_id)
    return capability.segments
