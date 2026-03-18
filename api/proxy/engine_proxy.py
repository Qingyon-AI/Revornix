import crud
import json
from typing import TypeVar

import schemas
from base_implement.engine_base import EngineBase
from base_implement.image_generate_engine_base import ImageGenerateEngineBase
from base_implement.markdown_engine_base import MarkdownEngineBase
from base_implement.stt_engine_base import STTEngineBase
from base_implement.tts_engine_base import TTSEngineBase
from data.sql.base import session_scope
from enums.engine_enums import UserEngineRole
from common.encrypt import decrypt_engine_config
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    get_user_plan_level_in_func,
    get_user_plan_start_time_in_func,
    plan_ability_checked_in_func,
)
from common.jwt_utils import create_token
from common.subscription_access import (
    SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
    has_plan_level_access,
    is_subscription_required_level,
)
from enums.ability import Ability
from enums.engine_enums import Engine, EngineProvided
from enums.user import UserRole
from common.usage_billing import get_monthly_used_points

T_Engine = TypeVar("T_Engine", bound=EngineBase)


class EngineProxy:

    # =========================
    # Factory（唯一推荐入口）
    # =========================
    @classmethod
    async def create(
        cls,
        *,
        user_id: int,
        engine_id: int,
    ) -> EngineBase:
        """
        async factory
        - 允许 await
        - 允许 HTTP / 权限校验
        - __init__ 只做纯赋值
        """

        engine_provided_uuid: str | None = None
        engine_uuid: str | None = None
        engine_config_json: str | None = None

        official_ability_base: str | None = None
        official_resource_uuid: str | None = None
        official_access_token: str | None = None
        required_plan_level = 0

        # ---------- DB（同步世界） ----------
        with session_scope() as db:
            db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
            if db_user is None:
                raise Exception("The user is not found")

            db_engine = crud.engine.get_engine_by_engine_id(
                db=db, 
                engine_id=engine_id
            )
            if db_engine is None:
                raise Exception("The engine is not found")
            
            # 如果私有且未公开 直接禁止
            if db_engine.creator_id != db_user.id and not db_engine.is_public:
                raise Exception("The engine is not public, you are forbidden to use it")

            db_user_engine = crud.engine.get_user_engine_by_user_id_and_engine_id(
                db=db,
                user_id=user_id,
                engine_id=db_engine.id,
                filter_role=UserEngineRole.FORKER
            )
            # 如果公开但是没有fork 阻止 同时提醒fork
            if db_engine.creator_id != db_user.id and db_engine.is_public and db_user_engine is None:
                raise Exception("The user is not the forker of the public engine, please fork it first")
        
            # ---------- Official engine provider check ----------
            if db_user.role != UserRole.ADMIN and db_user.role != UserRole.ROOT:
                required_plan_level = db_engine.required_plan_level
                if is_subscription_required_level(required_plan_level):
                    official_access_token, _ = create_token(user=db_user)
                if db_engine.uuid == Engine.Official_Volc_TTS.meta.uuid:
                    official_ability_base = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED.value
                    official_resource_uuid = db_engine.uuid
                elif db_engine.uuid == Engine.Official_Banana_Image.meta.uuid:
                    official_ability_base = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED.value
                    official_resource_uuid = db_engine.uuid

            engine_provided_uuid = db_engine.engine_provided.uuid
            engine_uuid = db_engine.uuid
            engine_config_json = db_engine.config_json

        deployed_by_official = check_deployed_by_official_in_fuc()
        if deployed_by_official and is_subscription_required_level(required_plan_level):
            if official_access_token is None:
                raise Exception("Failed to create access token for official engine subscription check")
            authorization = f"Bearer {official_access_token}"
            user_plan_level = await get_user_plan_level_in_func(
                authorization=authorization,
            )
            if not has_plan_level_access(
                required_plan_level=required_plan_level,
                user_plan_level=user_plan_level,
            ):
                raise schemas.error.CustomException(
                    message=SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
                    code=403,
                )
        if deployed_by_official and official_ability_base and official_resource_uuid:
            if official_access_token is None:
                raise Exception("Failed to create access token for official engine ability check")
            authorization = f"Bearer {official_access_token}"
            plan_start_time = await get_user_plan_start_time_in_func(
                authorization=authorization,
            )
            with session_scope() as db:
                token_total = get_monthly_used_points(
                    db=db,
                    user_id=user_id,
                    resource_uuid=official_resource_uuid,
                    cycle_anchor_at=plan_start_time,
                )

            ability = official_ability_base
            if official_ability_base == Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED.value:
                if token_total > 1_000_000:
                    ability = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED_MORE.value
                if token_total > 10_000_000:
                    ability = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED_NONE.value
            elif official_ability_base == Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED.value:
                if token_total > 100_000:
                    ability = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED_MORE.value
                if token_total > 1000_000:
                    ability = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED_NONE.value

            authorized = await plan_ability_checked_in_func(
                ability=ability,
                authorization=authorization
            )
            if not authorized:
                raise schemas.error.CustomException(
                    message="plan ability denied",
                    code=403,
                )

        if engine_provided_uuid is None or engine_uuid is None:
            raise Exception("The engine metadata is missing")

        engine: EngineBase | None = None
        if engine_provided_uuid == EngineProvided.Volc_TTS.meta.uuid:
            from engine.tts.volc.tts import VolcTTSEngine
            engine = VolcTTSEngine()
        elif engine_provided_uuid == EngineProvided.Banana_Image.meta.uuid:
            from engine.image_generate.banana import BananaImageGenerateEngine
            engine = BananaImageGenerateEngine()
        elif engine_provided_uuid == EngineProvided.Kimi_Image_Understand.meta.uuid:
            from engine.image_understand.kimi import KimiImageUnderstandEngine
            engine = KimiImageUnderstandEngine()
        elif engine_provided_uuid == EngineProvided.Jina.meta.uuid:
            from engine.markdown.jina import JinaEngine
            engine = JinaEngine()
        elif engine_provided_uuid == EngineProvided.MarkitDown.meta.uuid:
            from engine.markdown.markitdown import MarkitdownEngine
            engine = MarkitdownEngine()
        elif engine_provided_uuid == EngineProvided.MinerU_API.meta.uuid:
            from engine.markdown.mineru_api import MineruApiEngine
            engine = MineruApiEngine()
        elif engine_provided_uuid == EngineProvided.OpenAI_TTS.meta.uuid:
            from engine.tts.openai_audio import OpenAIAudioEngine
            engine = OpenAIAudioEngine()
        elif engine_provided_uuid == EngineProvided.Volc_STT_Standard.meta.uuid:
            from engine.stt.volc_standard import VolcSTTStandardEngine
            engine = VolcSTTStandardEngine()
        elif engine_provided_uuid == EngineProvided.Volc_STT_Fast.meta.uuid:
            from engine.stt.volc_fast import VolcSTTFastEngine
            engine = VolcSTTFastEngine()
        else:
            raise Exception("Unknown engine provided")

        if engine_config_json:
            engine_config = decrypt_engine_config(engine_config_json)
            config_json = json.loads(engine_config)
            engine.set_engine_config(config_json)
        engine.set_user_id(user_id=user_id)
        engine.set_resource_uuid(resource_uuid=engine_uuid)

        return engine

    @staticmethod
    def _ensure_engine_type(
        *,
        engine: EngineBase,
        expected_type: type[T_Engine],
        expected_name: str,
    ) -> T_Engine:
        if not isinstance(engine, expected_type):
            raise Exception(f"The selected engine is not a {expected_name} engine")
        return engine

    @classmethod
    async def create_markdown_engine(
        cls,
        *,
        user_id: int,
        engine_id: int,
    ) -> MarkdownEngineBase:
        engine = await cls.create(user_id=user_id, engine_id=engine_id)
        return cls._ensure_engine_type(
            engine=engine,
            expected_type=MarkdownEngineBase,
            expected_name="markdown convert",
        )

    @classmethod
    async def create_tts_engine(
        cls,
        *,
        user_id: int,
        engine_id: int,
    ) -> TTSEngineBase:
        engine = await cls.create(user_id=user_id, engine_id=engine_id)
        return cls._ensure_engine_type(
            engine=engine,
            expected_type=TTSEngineBase,
            expected_name="tts",
        )

    @classmethod
    async def create_stt_engine(
        cls,
        *,
        user_id: int,
        engine_id: int,
    ) -> STTEngineBase:
        engine = await cls.create(user_id=user_id, engine_id=engine_id)
        return cls._ensure_engine_type(
            engine=engine,
            expected_type=STTEngineBase,
            expected_name="stt",
        )

    @classmethod
    async def create_image_generate_engine(
        cls,
        *,
        user_id: int,
        engine_id: int,
    ) -> ImageGenerateEngineBase:
        engine = await cls.create(user_id=user_id, engine_id=engine_id)
        return cls._ensure_engine_type(
            engine=engine,
            expected_type=ImageGenerateEngineBase,
            expected_name="image generate",
        )
