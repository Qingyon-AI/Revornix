from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

import crud
import models
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    get_user_plan_level_in_func,
)
from common.jwt_utils import create_token
from common.subscription_access import (
    SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
    has_plan_level_access,
    is_subscription_required_level,
)
from enums.user import UserRole
from schemas.error import CustomException


SUBSCRIPTION_GATE_ENABLED = check_deployed_by_official_in_fuc()


def is_privileged_user(user: models.user.User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.ROOT)


def is_model_owned_by_user(
    *,
    user: models.user.User,
    db_model: models.model.AIModel,
) -> bool:
    return db_model.provider.creator_id == user.id


async def ensure_required_plan_level_access(
    *,
    user: models.user.User,
    required_plan_level: int | None,
) -> None:
    if (
        not SUBSCRIPTION_GATE_ENABLED
        or is_privileged_user(user)
        or not is_subscription_required_level(required_plan_level)
    ):
        return

    access_token, _ = create_token(user=user)
    user_plan_level = await get_user_plan_level_in_func(
        authorization=f"Bearer {access_token}",
    )
    if not has_plan_level_access(
        required_plan_level=required_plan_level,
        user_plan_level=user_plan_level,
    ):
        raise CustomException(
            message=SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
            code=403,
        )


async def ensure_model_access(
    *,
    db: Session | AsyncSession,
    user: models.user.User,
    model_id: int,
):
    if isinstance(db, AsyncSession):
        db_model = await crud.model.get_ai_model_by_id_async(
            db=db,
            model_id=model_id,
        )
    else:
        db_model = crud.model.get_ai_model_by_id(
            db=db,
            model_id=model_id,
        )
    if db_model is None:
        raise CustomException(message="Model not found", code=404)

    if is_model_owned_by_user(user=user, db_model=db_model):
        return db_model

    await ensure_required_plan_level_access(
        user=user,
        required_plan_level=db_model.required_plan_level,
    )
    return db_model


async def ensure_engine_access(
    *,
    db: Session | AsyncSession,
    user: models.user.User,
    engine_id: int,
):
    if isinstance(db, AsyncSession):
        db_engine = await crud.engine.get_engine_by_engine_id_async(
            db=db,
            engine_id=engine_id,
        )
    else:
        db_engine = crud.engine.get_engine_by_engine_id(
            db=db,
            engine_id=engine_id,
        )
    if db_engine is None:
        raise CustomException(message="Engine not found", code=404)

    await ensure_required_plan_level_access(
        user=user,
        required_plan_level=db_engine.required_plan_level,
    )
    return db_engine


async def ensure_default_resources_access(
    *,
    user: models.user.User,
    db: Session | AsyncSession,
    model_ids: list[int | None] | None = None,
    engine_ids: list[int | None] | None = None,
) -> None:
    required_plan_level = 0

    for model_id in model_ids or []:
        if model_id is None:
            continue
        if isinstance(db, AsyncSession):
            db_model = await crud.model.get_ai_model_by_id_async(
                db=db,
                model_id=model_id,
            )
        else:
            db_model = crud.model.get_ai_model_by_id(
                db=db,
                model_id=model_id,
            )
        if db_model is None:
            raise CustomException(message="Model not found", code=404)
        if is_model_owned_by_user(user=user, db_model=db_model):
            continue
        if db_model.required_plan_level > required_plan_level:
            required_plan_level = db_model.required_plan_level
        if is_subscription_required_level(required_plan_level):
            break

    if not is_subscription_required_level(required_plan_level):
        for engine_id in engine_ids or []:
            if engine_id is None:
                continue
            if isinstance(db, AsyncSession):
                db_engine = await crud.engine.get_engine_by_engine_id_async(
                    db=db,
                    engine_id=engine_id,
                )
            else:
                db_engine = crud.engine.get_engine_by_engine_id(
                    db=db,
                    engine_id=engine_id,
                )
            if db_engine is None:
                raise CustomException(message="Engine not found", code=404)
            if db_engine.required_plan_level > required_plan_level:
                required_plan_level = db_engine.required_plan_level

    await ensure_required_plan_level_access(
        user=user,
        required_plan_level=required_plan_level,
    )
