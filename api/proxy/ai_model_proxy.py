from pydantic import BaseModel

import crud
import schemas
from data.sql.base import async_session_context
from common.encrypt import decrypt_api_key
from common.logger import exception_logger
from enums.model import UserModelProviderRole
from enums.product import PlanAccessLevel
from enums.user import UserRole
from common.jwt_utils import create_token
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    get_user_compute_balance_in_func,
    get_user_plan_level_in_func,
)
from common.usage_billing import get_minimum_required_points
from common.subscription_access import (
    SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
    has_plan_level_access,
    is_subscription_required_level,
)
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
    ) -> "AIModelProxy":
        """
        async factory
        - 允许 await
        - 允许 HTTP / 权限校验
        - __init__ 只做纯赋值
        """

        model_name: str | None = None
        provider_base_url: str | None = None
        provider_api_key: str | None = None
        provider_creator_id: int | None = None
        provider_is_public = False
        model_db_id: int | None = None
        model_owned_by_user = False
        official_provider_check_needed = False
        required_plan_level = 0
        official_access_token: str | None = None
        user_is_privileged = False
        user_plan_level = PlanAccessLevel.FREE
        available_compute_points = 0
        minimum_required_points = 1

        try:
            async with async_session_context() as db:
                db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
                if db_user is None:
                    raise Exception("The user is not found")
                user_is_privileged = (
                    db_user.role == UserRole.ADMIN
                    or db_user.role == UserRole.ROOT
                )

                db_model = await crud.model.get_ai_model_by_id_async(db=db, model_id=model_id)
                if db_model is None:
                    raise Exception("The model is not found")

                db_model_provider = await crud.model.get_ai_model_provider_by_id_async(
                    db=db,
                    provider_id=db_model.provider_id,
                )
                if db_model_provider is None:
                    raise Exception("The Model provider of the model is not found, please contact the administrator")

                model_name = db_model.name
                provider_base_url = db_model_provider.base_url
                provider_api_key = db_model_provider.api_key
                provider_creator_id = db_model_provider.creator_id
                provider_is_public = bool(db_model_provider.is_public)
                model_db_id = db_model.id
                required_plan_level = db_model.required_plan_level
                model_owned_by_user = provider_creator_id == user_id
                minimum_required_points = get_minimum_required_points(
                    multiplier=db_model.compute_point_multiplier,
                )

                if not user_is_privileged:
                    if not model_owned_by_user and bool(db_model.is_official_hosted):
                        official_provider_check_needed = True
                    if official_provider_check_needed or (
                        not model_owned_by_user
                        and is_subscription_required_level(required_plan_level)
                    ):
                        official_access_token, _ = create_token(user=db_user)

                if not model_owned_by_user:
                    if not provider_is_public:
                        raise Exception("The model provider for the model is not public, you are forbidden to use it")
                    db_user_model_provider = await crud.model.get_user_ai_model_provider_by_user_and_model_provider_id_async(
                        db=db,
                        user_id=user_id,
                        ai_model_provider_id=db_model_provider.id,
                        filter_role=UserModelProviderRole.FORKER
                    )
                    if db_user_model_provider is None:
                        raise Exception("The user is not the forker of the model provider")
        except Exception as e:
            exception_logger.error(f'''Error occurred while creating AI model proxy: {e}''')
            raise

        deployed_by_official = check_deployed_by_official_in_fuc()
        if (
            deployed_by_official
            and not user_is_privileged
            and not model_owned_by_user
            and is_subscription_required_level(required_plan_level)
        ):
            if official_access_token is None:
                raise Exception("Model subscription access token is missing")
            authorization = f"Bearer {official_access_token}"
            user_plan_level = await get_user_plan_level_in_func(
                authorization=authorization,
            )
            if not has_plan_level_access(
                required_plan_level=required_plan_level,
                user_plan_level=user_plan_level,
            ):
                if official_provider_check_needed:
                    available_compute_points = await get_user_compute_balance_in_func(
                        authorization=authorization,
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

        if (
            deployed_by_official
            and not user_is_privileged
            and not model_owned_by_user
            and official_provider_check_needed
        ):
            if official_access_token is None:
                raise Exception("Official model provider metadata is missing")
            authorization = f"Bearer {official_access_token}"
            if available_compute_points <= 0:
                available_compute_points = await get_user_compute_balance_in_func(
                    authorization=authorization,
                )
            if available_compute_points < minimum_required_points:
                raise schemas.error.CustomException(
                    message="Official LLM compute points exhausted. Please upgrade your plan or buy a compute pack.",
                    code=403,
                )

        if model_name is None or provider_base_url is None:
            raise Exception("The model provider metadata is incomplete")

        return cls(
            api_key=provider_api_key,
            base_url=provider_base_url,
            model_name=model_name,
        )

    # =========================
    # Public API
    # =========================

    def get_configuration(self) -> AIModelConfiguration:
        return AIModelConfiguration(
            api_key=decrypt_api_key(self.api_key) if self.api_key is not None else None,
            base_url=self.base_url,
            model_name=self.model_name,
        )
