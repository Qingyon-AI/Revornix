import crud
from data.sql.base import SessionLocal
from enums.model import UserModelProviderRole
from datetime import datetime, timedelta, timezone
from common.dependencies import check_deployed_by_official_in_fuc, plan_ability_checked_in_func, get_user_token_usage
from common.jwt_utils import create_token
from enums.ability import Ability
from enums.engine_enums import Engine, EngineProvided
from enums.user import UserRole
from engine import (
    BananaImageGenerateEngine,
    JinaEngine,
    MineruEngine,
    MineruApiEngine,
    MarkitdownEngine,
    OpenAIAudioEngine,
    VolcTTSEngine,
)

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
    ):
        """
        async factory
        - 允许 await
        - 允许 HTTP / 权限校验
        - __init__ 只做纯赋值
        """

        # ---------- DB（同步世界） ----------
        with SessionLocal() as db:
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
                filter_role=UserModelProviderRole.FORKER
            )
            # 如果公开但是没有fork 阻止 同时提醒fork
            if db_engine.creator_id != db_user.id and db_engine.is_public and db_user_engine is None:
                raise Exception("The user is not the forker of the public engine, please fork it first")

            # ---------- Official engine provider check ----------
            if db_user.role != UserRole.ADMIN and db_user.role != UserRole.ROOT:
                ability = None
                if db_engine.engine_provided.uuid == Engine.Official_Volc_TTS.meta.uuid:
                    ability = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED.value
                    end_time = datetime.now(timezone.utc)
                    start_time = end_time - timedelta(days=30)
                    token_usage = await get_user_token_usage(
                        user_id=user_id,
                        model_name='volc-podcast',
                        start_time=start_time,
                        end_time=end_time,
                    )
                    if token_usage is not None:
                        token_total = token_usage.get('total')
                        if token_total is not None:
                            if token_total > 1_000_000:
                                ability = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED_MORE.value
                            if token_total > 10_000_000:
                                ability = Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED_NONE.value

                elif db_engine.engine_provided.uuid == Engine.Official_Banana_Image.meta.uuid:
                    ability = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED.value
                    end_time = datetime.now(timezone.utc)
                    start_time = end_time - timedelta(days=30)
                    token_usage = await get_user_token_usage(
                        user_id=user_id,
                        model_name='gemini-3-pro-image-preview',
                        start_time=start_time,
                        end_time=end_time,
                    )
                    if token_usage is not None:
                        token_total = token_usage.get('total')
                        if token_total is not None:
                            if token_total > 100_000:
                                ability = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED_MORE.value
                            if token_total > 1000_000:
                                ability = Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED_NONE.value

                deployed_by_official = check_deployed_by_official_in_fuc()
                if ability and deployed_by_official:
                    access_token, _ = create_token(user=db_user)
                    authorized = await plan_ability_checked_in_func(
                        ability=ability,
                        authorization=f"Bearer {access_token}"
                    )
                    if not authorized:
                        raise PermissionError("plan ability denied")
        
        engine = None
        if db_engine.engine_provided.uuid == EngineProvided.Volc_TTS.meta.uuid:
            engine = VolcTTSEngine()
        elif db_engine.engine_provided.uuid == EngineProvided.Banana_Image.meta.uuid:
            engine = BananaImageGenerateEngine()
        elif db_engine.engine_provided.uuid == EngineProvided.Jina.meta.uuid:
            engine = JinaEngine()
        elif db_engine.engine_provided.uuid == EngineProvided.MarkitDown.meta.uuid:
            engine = MarkitdownEngine()
        elif db_engine.engine_provided.uuid == EngineProvided.MinerU.meta.uuid:
            engine = MineruEngine()
        elif db_engine.engine_provided.uuid == EngineProvided.MinerU_API.meta.uuid:
            engine = MineruApiEngine()
        elif db_engine.engine_provided.uuid == EngineProvided.OpenAI_TTS.meta.uuid:
            engine = OpenAIAudioEngine()
        else:
            raise Exception("Unknown engine provided")

        return engine