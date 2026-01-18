import crud
from typing import Optional

from pydantic import BaseModel

from data.sql.base import SessionLocal
from enums.model import UserModelProviderRole


# =========================
# DTO
# =========================

class AIModelConfiguration(BaseModel):
    model_name: str
    base_url: str
    api_key: Optional[str]


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
                        api_key=db_user_model_provider.api_key,
                        base_url=db_user_model_provider.base_url,
                        model_name=db_model.name,
                    )
            else:
                raise Exception("The model provider for the model is not public, you are forbidden to use it")

    # =========================
    # Public API
    # =========================

    def get_configuration(self) -> AIModelConfiguration:
        return AIModelConfiguration(
            api_key=self.api_key,
            base_url=self.base_url,
            model_name=self.model_name,
        )