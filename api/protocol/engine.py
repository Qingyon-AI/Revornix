import json
from datetime import datetime, timedelta, timezone
from typing import Protocol

import crud
from common.dependencies import check_deployed_by_official_in_fuc, get_user_token_usage, plan_ability_checked_in_func
from common.jwt_utils import create_token
from common.logger import exception_logger
from data.sql.base import SessionLocal
from enums.ability import Ability
from enums.engine import Engine


class EngineProtocol(Protocol):

    engine_uuid: str
    engine_name: str
    engine_name_zh: str
    engine_category: int
    engine_description: str | None
    engine_description_zh: str | None
    engine_demo_config: str | None
    engine_config: str | None = None

    user_id: int | None = None

    def __init__(
        self,
        engine_uuid: str,
        engine_name: str,
        engine_name_zh: str,
        engine_category: int,
        engine_description: str | None = None,
        engine_description_zh: str | None = None,
        engine_demo_config: str | None = None,
        engine_config: str | None = None
    ):
        self.engine_uuid = engine_uuid
        self.engine_name = engine_name
        self.engine_name_zh = engine_name_zh
        self.engine_category = engine_category
        self.engine_description = engine_description
        self.engine_description_zh = engine_description_zh
        self.engine_demo_config = engine_demo_config
        self.engine_config = engine_config

    def get_engine_config(self) -> dict | None:
        if self.engine_config is None:
            return None
        return json.loads(self.engine_config)

    async def init_engine_config_by_user_engine_id(
        self,
        user_engine_id: int
    ):
        db = SessionLocal()
        try:
            user_engine = crud.engine.get_user_engine_by_user_engine_id(
                db=db,
                user_engine_id=user_engine_id
            )
            if not user_engine:
                raise ValueError("user_engine not found")

            user = crud.user.get_user_by_id(
                db=db,
                user_id=user_engine.user_id
            )
            if not user:
                raise ValueError("user not found")

            engine = crud.engine.get_engine_by_engine_id(
                db=db,
                engine_id=user_engine.engine_id
            )
            if not engine:
                raise ValueError("engine not found")

            if engine.uuid != self.engine_uuid:
                raise ValueError("engine uuid mismatch")

            ability = None
            if engine.uuid == Engine.Official_Volc_TTS.meta.uuid:
                ability = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED.value
                end_time = datetime.now(timezone.utc)
                start_time = end_time - timedelta(days=30)
                token_usage = await get_user_token_usage(
                    user_id=user.id,
                    model_name='volc-podcast',
                    start_time=start_time,
                    end_time=end_time,
                )
                if token_usage is not None:
                    token_total = token_usage.get('total')
                    if token_total is not None:
                        if token_total > 1000000:
                            ability = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED_MORE.value
                        if token_total > 10000000:
                            ability = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED_NONE.value

            elif engine.uuid == Engine.Official_Banana_Image.meta.uuid:
                ability = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED.value
                end_time = datetime.now(timezone.utc)
                start_time = end_time - timedelta(days=30)
                token_usage = await get_user_token_usage(
                    user_id=user.id,
                    model_name='gemini-3-pro-image-preview',
                    start_time=start_time,
                    end_time=end_time,
                )
                if token_usage is not None:
                    token_total = token_usage.get('total')
                    if token_total is not None:
                        if token_total > 1000000:
                            ability = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED_MORE.value
                        if token_total > 10000000:
                            ability = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED_NONE.value

            deployed_by_official = check_deployed_by_official_in_fuc()
            if ability and deployed_by_official:
                access_token, _ = create_token(user=user)
                authorized = await plan_ability_checked_in_func(
                    ability=ability,
                    authorization=f"Bearer {access_token}"
                )
                if not authorized:
                    raise PermissionError("plan ability denied")

            self.engine_config = user_engine.config_json

            self.user_id = user_engine.user_id
        except Exception as e:
            exception_logger.error(f"engine init error: {e}")
            raise
        finally:
            db.close()
