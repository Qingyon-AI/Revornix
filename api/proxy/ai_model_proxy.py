
from pydantic import BaseModel

import crud
from datetime import datetime, timezone, timedelta
from data.sql.base import SessionLocal
from enums.model import UserModelProviderRole, OfficialModelProvider
from enums.ability import Ability
from enums.user import UserRole
from common.encrypt import decrypt_api_key
from common.jwt_utils import create_token
from common.dependencies import check_deployed_by_official_in_fuc, get_user_token_usage, plan_ability_checked_in_func

# =========================
# DTO
# =========================

class AIModelConfiguration(BaseModel):
    model_name: str
    base_url: str
    api_key: str | None


# =========================
# Domain Object
# =========================

class AIModelProxy:
    """
    只负责“已校验后的模型代理配置”
    """

    def __init__(
        self,
        *,
        model_name: str,
        base_url: str,
        api_key: str | None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.model_name = model_name

    # =========================
    # Factory（唯一推荐入口）
    # =========================

    @classmethod
    async def create(
        cls,
        *,
        user_id: int,
        model_id: int,
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

            db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
            if db_model is None:
                raise Exception("The model is not found")

            db_model_provider = crud.model.get_ai_model_provider_by_id(
                db=db,
                provider_id=db_model.provider_id,
            )
            if db_model_provider is None:
                raise Exception("The Model provider of the model is not found, please contact the administrator")
            
            # ---------- Official model provider check ----------
            if db_user.role != UserRole.ADMIN and db_user.role != UserRole.ROOT and db_model_provider.uuid == OfficialModelProvider.Revornix.meta.id:
                # 生成用户 token
                access_token, _ = create_token(user=db_user)

                deployed_by_official = check_deployed_by_official_in_fuc()
                
                ability = Ability.OFFICIAL_PROXIED_LLM_LIMITED.value

                end_time = datetime.now(timezone.utc)
                start_time = end_time - timedelta(days=30)
                token_usage = await get_user_token_usage(
                    user_id=user_id,
                    model_name=db_model.name,
                    start_time=start_time,
                    end_time=end_time,
                )
                if token_usage is not None:
                    token_total = token_usage.get('total')
                    if token_total is not None:
                        if token_total > 1_000_000:
                            ability = Ability.OFFICIAL_PROXIED_LLM_LIMITED_MORE.value
                        if token_total > 10_000_000:
                            ability = Ability.OFFICIAL_PROXIED_LLM_LIMITED_NONE.value
                
                # 权限校验（async）
                auth_status = await plan_ability_checked_in_func(
                    ability=ability,
                    authorization=f"Bearer {access_token}",
                )

                if deployed_by_official and not auth_status:
                    raise PermissionError(
                        "User does not have permission to use official LLM model"
                    )
            
            if db_model_provider.creator_id == user_id:
                # 如果用户本人就是创建者 那么直接返回即可
                return cls(
                    api_key=db_model_provider.api_key,
                    base_url=db_model_provider.base_url,
                    model_name=db_model.name,
                )
            if db_model_provider.is_public:
                db_user_model_provider = crud.model.get_user_ai_model_provider_by_user_and_model_provider_id(
                    db=db,
                    user_id=user_id,
                    ai_model_provider_id=db_model_provider.id,
                    filter_role=UserModelProviderRole.FORKER
                )
                if db_user_model_provider is None:
                    raise Exception("The user is not the forker of the model provider")
                else:
                    # 如果该模型供应商是公开的 且用户是forker 那么直接返回即可
                    return cls(
                        api_key=db_model_provider.api_key,
                        base_url=db_model_provider.base_url,
                        model_name=db_model.name,
                    )
            else:
                raise Exception("The model provider for the model is not public, you are forbidden to use it")

    # =========================
    # Public API
    # =========================

    def get_configuration(self) -> AIModelConfiguration:
        return AIModelConfiguration(
            api_key=decrypt_api_key(self.api_key) if self.api_key is not None else None,
            base_url=self.base_url,
            model_name=self.model_name,
        )
