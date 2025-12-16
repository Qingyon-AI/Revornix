import os

import crud
from common.logger import exception_logger, info_logger
from enums.model import OfficialModelProvider, OfficialModel
from data.sql.base import SessionLocal
from engine.tts.official_openai import OfficialOpenAITTSEngine
from engine.image.official_banana import OfficialBananaImageGenerateEngine
from protocol.engine import EngineProtocol


ENV = os.getenv("ENV", "development")
ALLOW_DB_RESET = os.getenv("ALLOW_DB_RESET", "0") == "1"

if ENV != "development" and not ALLOW_DB_RESET:
    raise RuntimeError(
        "❌ Refusing to reset database in non-development environment.\n"
        "Set ALLOW_DB_RESET=1 if you really want to do this."
    )


def seed_database(db):
    # ================================
    # Model Providers
    # ================================
    model_providers: list[OfficialModelProvider] = [
        OfficialModelProvider.Revornix
    ]

    for provider in model_providers:
        meta = provider.meta

        if crud.model.get_ai_model_provider_by_uuid(db, meta.id) is None:
            crud.model.create_ai_model_provider(
                db=db,
                uuid=meta.id,
                name=meta.title,
                description=meta.description,
            )

    # ================================
    # Models
    # ================================
    models: list[OfficialModel] = [
        OfficialModel.llm
    ]

    for model in models:
        meta = model.meta

        if crud.model.get_ai_model_by_uuid(db, meta.id) is None:
            provider = crud.model.get_ai_model_provider_by_uuid(
                db=db,
                uuid=OfficialModelProvider.Revornix.meta.id
            )
            
            if provider is None:
                raise RuntimeError(
                    "❌ Model provider not found: "
                    f"{OfficialModelProvider.Revornix.meta.id}"
                )

            crud.model.create_ai_model(
                db=db,
                uuid=meta.id,
                name=meta.title,
                description=meta.description,
                provider_id=provider.id,
            )

    # ================================
    # Engines
    # ================================
    engines: list[EngineProtocol] = [
        OfficialBananaImageGenerateEngine(),
        OfficialOpenAITTSEngine(),
    ]

    for engine in engines:
        if crud.engine.get_engine_by_uuid(db, engine.engine_uuid) is None:
            crud.engine.create_engine(
                db=db,
                uuid=engine.engine_uuid,
                category=engine.engine_category,
                name=engine.engine_name,
                name_zh=engine.engine_name_zh,
                description=engine.engine_description,
                description_zh=engine.engine_description_zh,
                demo_config=engine.engine_demo_config,
            )


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
        db.commit()
        info_logger.info("✅ Official Database data initialized successfully")
    except Exception as e:
        exception_logger.exception(
            f"❌ Official Database data initialization failed: {e}"
        )
        db.rollback()
        raise
    finally:
        db.close()