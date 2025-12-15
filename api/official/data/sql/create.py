import crud
import os
from common.logger import exception_logger, info_logger
from enums.model import OfficialModelProvider, OfficialModel
from data.sql.base import SessionLocal

ENV = os.getenv("ENV", "development")
ALLOW_DB_RESET = os.getenv("ALLOW_DB_RESET", "0") == "1"

if ENV != "development" and not ALLOW_DB_RESET:
    raise RuntimeError(
        "❌ Refusing to reset database in non-development environment.\n"
        "Set ALLOW_DB_RESET=1 if you really want to do this."
    )
    
if __name__ == "__main__":
    try:
        db = SessionLocal()
        db_official_llm_model_provider = crud.model.create_ai_model_provider(
            db=db,
            name='Revornix Official Gateway',
            uuid=OfficialModelProvider.Revornix.value,
            description=(
                'Revornix-operated LLM gateway. '
                'Models are provided via Revornix-managed routing, '
                'including official and licensed upstream providers.'
            )
        )
        db_official_llm_model = crud.model.create_ai_model(
            db=db,
            name='gpt-5.2',
            description='gpt-5.2',
            provider_id=db_official_llm_model_provider.id,
            uuid=OfficialModel.llm.value
        )
        db_image_model = crud.model.create_ai_model(
            db=db,
            name='gemini-3-pro-image-preview',
            description='gemini-3-pro-image-preview',
            provider_id=db_official_llm_model_provider.id,
            uuid=OfficialModel.image.value
        )
        db_tts_model = crud.model.create_ai_model(
            db=db,
            name='gpt-audio',
            description='gpt-audio',
            provider_id=db_official_llm_model_provider.id,
            uuid=OfficialModel.tts.value
        )
        db.commit()
        info_logger.info("✅ Official AI Database Data reset & initialized successfully")
    except Exception as e:
        exception_logger.exception(f"❌ Official AI Database Data initialization failed: {e}")
        raise
    finally:
        db.close()
    