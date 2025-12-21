import crud
from common.logger import info_logger, exception_logger
from enums.model import OfficialModelProvider, OfficialModel
from data.sql.base import SessionLocal
from enums.engine import Engine

async def on_user_created(
    user_id: int
):
    try:
        info_logger.info(f"User created hooks start with user_id: {user_id}")
        db = SessionLocal()
        db_official_model_provider = crud.model.get_ai_model_provider_by_uuid(
            db=db,
            uuid=OfficialModelProvider.Revornix.meta.id   
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
            uuid=OfficialModel.llm.meta.id
        )
        if db_official_model_llm is None:
            raise Exception("Official Model LLM not found")
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
        db_official_openai_tts_engine = crud.engine.get_engine_by_uuid(
            db=db,
            uuid=Engine.Official_OpenAI_TTS.meta.uuid
        )
        if db_official_openai_tts_engine is None:
            raise Exception("Official OpenAI TTS Engine not found")
        crud.engine.create_user_engine(
            db=db,
            user_id=user_id,
            engine_id=db_official_openai_tts_engine.id,
            title='Revornix Proxied OpenAI TTS Engine',
            description='Revornix Proxied OpenAI TTS Engine',
            config_json=''
        )
        db_official_banana_image_generate_engine = crud.engine.get_engine_by_uuid(
            db=db,
            uuid=Engine.Official_Banana_Image.meta.uuid
        )
        if db_official_banana_image_generate_engine is None:
            raise Exception("Official Banana Image Generate Engine not found")
        crud.engine.create_user_engine(
            db=db,
            user_id=user_id,
            engine_id=db_official_banana_image_generate_engine.id,
            title='Revornix Proxied Banana Image Generator Engine',
            description='Revornix Proxied Banana Image Generator Engine',
            config_json=''
        )
        db.commit()
    except Exception as e:
        exception_logger.exception(f"Error on user created hook: {e}",)
    finally:
        db.close()