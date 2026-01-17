import crud
from common.logger import info_logger, exception_logger
from data.sql.base import SessionLocal
from enums.engine import Engine

async def on_user_created(
    user_id: int
):
    try:
        info_logger.info(f"User created hooks start with user_id: {user_id}")
        db = SessionLocal()
        db_official_volc_tts_engine = crud.engine.get_engine_by_uuid(
            db=db,
            uuid=Engine.Official_Volc_TTS.meta.uuid
        )
        if db_official_volc_tts_engine is None:
            raise Exception("Official Volc TTS Engine not found")
        crud.engine.create_user_engine(
            db=db,
            user_id=user_id,
            engine_id=db_official_volc_tts_engine.id,
            title='Revornix Proxied Volc TTS Engine',
            description='Revornix Proxied Volc TTS Engine',
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