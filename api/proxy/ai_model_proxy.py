import crud
from typing import Optional

from pydantic import BaseModel

from datetime import datetime, timedelta, timezone

from common.dependencies import get_user_token_usage
from data.sql.base import SessionLocal
from enums.model import OfficialModel, OfficialModelProvider
from enums.ability import Ability
from official.model.llm import (
    OFFICIAL_LLM_AI_BASE_URL,
    OFFICIAL_LLM_AI_KEY,
)
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    plan_ability_checked_in_func,
)
from common.jwt_utils import create_token


# =========================
# DTO
# =========================

class AIModelConfiguration(BaseModel):
    api_key: Optional[str]
    base_url: Optional[str]
    model_name: str


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
        api_key: str,
        base_url: str,
        model_name: str,
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
    ) -> "AIModelProxy":
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
                raise ValueError("User not found")

            db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
            if db_model is None:
                raise ValueError("Model not found")

            db_model_provider = crud.model.get_ai_model_provider_by_id(
                db=db,
                provider_id=db_model.provider_id,
            )
            if db_model_provider is None:
                raise ValueError("Model provider not found")

            db_user_model_provider = (
                crud.model.get_user_ai_model_provider_by_id_decrypted(
                    db=db,
                    user_id=user_id,
                    ai_model_provider_id=db_model_provider.id,
                )
            )

        # ---------- Official model ----------
        is_official_provider = (
            db_model_provider.uuid
            == OfficialModelProvider.Revornix.meta.id
        )

        is_official_llm = (
            db_model.uuid
            == OfficialModel.llm.meta.id
        )

        if is_official_provider and is_official_llm:
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
                    if token_total > 1000000:
                        ability = Ability.OFFICIAL_PROXIED_LLM_LIMITED_MORE.value
                    if token_total > 10000000:
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

            if not OFFICIAL_LLM_AI_KEY or not OFFICIAL_LLM_AI_BASE_URL:
                raise RuntimeError(
                    "Official LLM API key or base URL not configured"
                )

            return cls(
                api_key=OFFICIAL_LLM_AI_KEY,
                base_url=OFFICIAL_LLM_AI_BASE_URL,
                model_name=db_model.name,
            )

        # ---------- User custom model ----------
        if db_user_model_provider is None:
            raise ValueError("User model provider not found")

        if not db_user_model_provider.api_key or not db_user_model_provider.base_url:
            raise RuntimeError("User model provider config incomplete")

        return cls(
            api_key=db_user_model_provider.api_key,
            base_url=db_user_model_provider.base_url,
            model_name=db_model.name,
        )

    # =========================
    # Public API
    # =========================

    def get_configuration(self) -> AIModelConfiguration:
        return AIModelConfiguration(
            api_key=self.api_key,
            base_url=self.base_url,
            model_name=self.model_name,
        )