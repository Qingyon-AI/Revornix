import crud
import json
from typing import TypeVar

import schemas
from base_implement.engine_base import EngineBase
from base_implement.image_generate_engine_base import ImageGenerateEngineBase
from base_implement.markdown_engine_base import MarkdownEngineBase
from base_implement.stt_engine_base import STTEngineBase
from base_implement.tts_engine_base import TTSEngineBase
from data.sql.base import async_session_context
from enums.engine_enums import UserEngineRole
from common.encrypt import decrypt_engine_config
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    get_user_compute_balance_in_func,
    get_user_plan_level_in_func,
)
from common.usage_billing import get_minimum_required_points
from common.jwt_utils import create_token
from common.subscription_access import (
    SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
    has_plan_level_access,
    is_subscription_required_level,
)
from enums.ability import Ability
from enums.engine_enums import Engine, EngineProvided
from enums.product import PlanAccessLevel
from enums.user import UserRole

T_Engine = TypeVar("T_Engine", bound=EngineBase)
ENGINE_LIMITED_METHODS = (
    "analyse_website",
    "analyse_file",
    "synthesize",
    "transcribe_audio",
    "generate_image",
    "understand_image",
)


class EngineProxy:
    @staticmethod
    def _wrap_with_concurrency_limit(
        *,
        engine: EngineBase,
        method_name: str,
    ) -> None:
        method = getattr(engine, method_name, None)
        if method is None or not callable(method):
            return
        if getattr(method, "_revornix_concurrency_wrapped", False):
            return

        async def limited_method(*args, __method=method, **kwargs):
            return await engine.run_with_concurrency_limit(
                lambda: __method(*args, **kwargs)
            )

        setattr(limited_method, "_revornix_concurrency_wrapped", True)
        setattr(engine, method_name, limited_method)

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

        official_hosted_check_needed = False
        official_access_token: str | None = None
        required_plan_level = 0
        user_plan_level = PlanAccessLevel.FREE
        available_compute_points = 0
        minimum_required_points = 1
        max_concurrency = 3

        async with async_session_context() as db:
            db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
            if db_user is None:
                raise Exception("The user is not found")

            db_engine = await crud.engine.get_engine_by_engine_id_async(
                db=db,
                engine_id=engine_id
            )
            if db_engine is None:
                raise Exception("The engine is not found")
            
            if db_engine.creator_id != db_user.id and not db_engine.is_public:
                raise Exception("The engine is not public, you are forbidden to use it")

            db_user_engine = await crud.engine.get_user_engine_by_user_id_and_engine_id_async(
                db=db,
                user_id=user_id,
                engine_id=db_engine.id,
                filter_role=UserEngineRole.FORKER
            )
            if db_engine.creator_id != db_user.id and db_engine.is_public and db_user_engine is None:
                raise Exception("The user is not the forker of the public engine, please fork it first")
        
            if db_user.role != UserRole.ADMIN and db_user.role != UserRole.ROOT:
                required_plan_level = db_engine.required_plan_level
                if is_subscription_required_level(required_plan_level):
                    official_access_token, _ = create_token(user=db_user)
                official_hosted_check_needed = bool(db_engine.is_official_hosted)
                minimum_required_points = get_minimum_required_points(
                    multiplier=db_engine.compute_point_multiplier,
                )

            engine_provided_uuid = db_engine.engine_provided.uuid
            engine_uuid = db_engine.uuid
            engine_config_json = db_engine.config_json
            max_concurrency = db_engine.max_concurrency

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
                if official_hosted_check_needed:
                    available_compute_points = await get_user_compute_balance_in_func(
                        authorization=authorization
                    )
                    if available_compute_points < minimum_required_points:
                        raise schemas.error.CustomException(
                            message="Paid subscription or available compute points required.",
                            code=403,
                        )
                else:
                    raise schemas.error.CustomException(
                        message=SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
                        code=403,
                    )
        if deployed_by_official and official_hosted_check_needed:
            if official_access_token is None:
                raise Exception("Failed to create access token for official engine ability check")
            authorization = f"Bearer {official_access_token}"
            if available_compute_points <= 0:
                available_compute_points = await get_user_compute_balance_in_func(
                    authorization=authorization
                )
            if available_compute_points < minimum_required_points:
                raise schemas.error.CustomException(
                    message="Official hosted compute points exhausted. Please upgrade your plan or buy a compute pack.",
                    code=403,
                )

        if engine_provided_uuid is None or engine_uuid is None:
            raise Exception("The engine metadata is missing")

        engine: EngineBase | None = None
        if engine_provided_uuid == EngineProvided.Volc_TTS.meta.uuid:
            from engine.tts.volc.tts import VolcTTSEngine
            engine = VolcTTSEngine()
        elif engine_provided_uuid == EngineProvided.Volc_Image.meta.uuid:
            from engine.image_generate.volc import VolcImageGenerateEngine
            engine = VolcImageGenerateEngine()
        elif engine_provided_uuid == EngineProvided.Bailian_Image.meta.uuid:
            from engine.image_generate.bailian import BailianImageGenerateEngine
            engine = BailianImageGenerateEngine()
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
        engine.set_concurrency_control(
            queue_key=f"engine:{engine_id}",
            max_concurrency=max_concurrency,
        )
        for method_name in ENGINE_LIMITED_METHODS:
            cls._wrap_with_concurrency_limit(engine=engine, method_name=method_name)

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
