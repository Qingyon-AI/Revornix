import crud
from common.logger import info_logger, exception_logger
from enums.model import OfficialModelProvider, OfficialModel
from data.sql.base import SessionLocal

async def on_user_created(
    user_id: int
):
    try:
        info_logger.info(f"User created hooks start with user_id: {user_id}")
        db = SessionLocal()
        db_official_model_provider = crud.model.get_ai_model_provider_by_uuid(
            db=db,
            uuid=OfficialModelProvider.Revornix.value   
        )
        if db_official_model_provider is None:
            raise Exception("Official Model Provider not found")
        
        db_user_ai_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
            db=db,
            user_id=user_id,
            ai_model_provider_id=db_official_model_provider.id
        )
        if db_user_ai_model_provider is None:
            crud.model.create_user_ai_model_provider(
                db=db,
                user_id=user_id,
                ai_model_provider_id=db_official_model_provider.id
            )
        db_official_model_llm = crud.model.get_ai_model_by_uuid(
            db=db,
            uuid=OfficialModel.llm.value
        )
        db_official_model_image = crud.model.get_ai_model_by_uuid(
            db=db,
            uuid=OfficialModel.image.value
        )
        db_official_model_tts = crud.model.get_ai_model_by_uuid(
            db=db,
            uuid=OfficialModel.tts.value
        )
        if db_official_model_llm is None:
            raise Exception("Official Model LLM not found")
        if db_official_model_image is None:
            raise Exception("Official Model Image not found")
        if db_official_model_tts is None:
            raise Exception("Official Model TTS not found")
        db_user_ai_model_llm_official = crud.model.get_user_ai_model_by_id(
            db=db,
            user_id=user_id,
            ai_model_id=db_official_model_llm.id
        )
        if db_user_ai_model_llm_official is None:
            crud.model.create_user_ai_model(
                db=db,
                user_id=user_id,
                ai_model_id=db_official_model_llm.id,
            )
        db_user_ai_model_image_official = crud.model.get_user_ai_model_by_id(
            db=db,
            user_id=user_id,
            ai_model_id=db_official_model_image.id,
        )
        if db_user_ai_model_image_official is None:
            crud.model.create_user_ai_model(
                db=db,
                user_id=user_id,
                ai_model_id=db_official_model_image.id,
            )
        db_user_ai_model_tts_official = crud.model.get_user_ai_model_by_id(
            db=db,
            user_id=user_id,
            ai_model_id=db_official_model_tts.id,
        )
        if db_user_ai_model_tts_official is None:
            db_user_ai_model_tts_official = crud.model.create_user_ai_model(
                db=db,
                user_id=user_id,
                ai_model_id=db_official_model_tts.id,
            )
        db.commit()
    except Exception as e:
        exception_logger.exception(f"Error on user created hook: {e}",)
    finally:
        db.close()