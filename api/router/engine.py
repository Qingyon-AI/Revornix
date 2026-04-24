import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

import crud
import models
import schemas
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    get_async_db,
    get_current_user,
    get_current_user_short_lived,
    get_user_plan_level_in_func,
)
from common.resource_plan_access import ensure_engine_access, ensure_required_plan_level_access
from common.jwt_utils import create_token
from common.subscription_access import (
    SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
    has_plan_level_access,
    is_subscription_required_level,
    normalize_plan_access_level,
)
from enums.engine_enums import UserEngineRole
from enums.user import UserRole
from common.encrypt import decrypt_engine_config, encrypt_engine_config
from proxy.engine_proxy import EngineProxy
from data.sql.base import async_session_context

engine_router = APIRouter()
SUBSCRIPTION_GATE_ENABLED = check_deployed_by_official_in_fuc()
DATA_URL_PATTERN = re.compile(
    r"data:image\/(?:png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+"
)


def _is_privileged_user(user: models.user.User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.ROOT)


def _ensure_privileged_user(user: models.user.User) -> None:
    if not _is_privileged_user(user):
        raise schemas.error.CustomException(
            message="Only administrators can inspect billing audit issues.",
            code=403,
        )


async def _ensure_subscription_access(
    *,
    user: models.user.User,
    required_plan_level: int | None,
) -> None:
    if (
        not SUBSCRIPTION_GATE_ENABLED
        or not is_subscription_required_level(required_plan_level)
        or _is_privileged_user(user)
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
        raise schemas.error.CustomException(
            message=SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
            code=403,
        )


def _serialize_engine_info(
    db_engine: models.engine.Engine,
    *,
    is_forked: bool | None = None,
) -> schemas.engine.EngineInfo:
    required_plan_level = normalize_plan_access_level(db_engine.required_plan_level)
    base = schemas.engine.EngineBaseInfo.model_validate(db_engine)
    return schemas.engine.EngineInfo.model_validate(
        {
            **base.model_dump(),
            "category": db_engine.engine_provided.category,
            "is_forked": is_forked,
            "required_plan_level": int(required_plan_level),
            "subscription_required": is_subscription_required_level(
                required_plan_level,
            ),
        }
    )


def _serialize_engine_detail(
    db_engine: models.engine.Engine,
    *,
    include_config_json: bool,
) -> schemas.engine.EngineDetail:
    required_plan_level = normalize_plan_access_level(db_engine.required_plan_level)
    base = schemas.engine.EngineBaseInfo.model_validate(db_engine)
    return schemas.engine.EngineDetail.model_validate(
        {
            **base.model_dump(exclude={"is_forked"}),
            "category": db_engine.engine_provided.category,
            "config_json": (
                decrypt_engine_config(db_engine.config_json)
                if include_config_json and db_engine.config_json is not None
                else None
            ),
            "required_plan_level": int(required_plan_level),
            "subscription_required": is_subscription_required_level(
                required_plan_level,
            ),
        }
    )


@engine_router.post(
    "/billing-audit",
    response_model=schemas.engine.BillingAuditResponse,
)
async def inspect_engine_billing_audit(
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)

    usage_rows = (
        await db.execute(
            select(
            models.usage.UsageLedger.resource_uuid,
            func.count(models.usage.UsageLedger.id),
            func.coalesce(func.sum(models.usage.UsageLedger.billable_points), 0),
        )
            .where(models.usage.UsageLedger.resource_type == "engine")
            .group_by(models.usage.UsageLedger.resource_uuid)
        )
    )
    usage_rows = usage_rows.all()
    usage_map = {
        resource_uuid: {
            "count": int(total_count or 0),
            "charged_points": int(total_points or 0),
        }
        for resource_uuid, total_count, total_points in usage_rows
    }

    db_engines = list(
        (
            await db.execute(
                select(models.engine.Engine)
                .options(
                    joinedload(models.engine.Engine.creator),
                    joinedload(models.engine.Engine.engine_provided),
                )
                .where(models.engine.Engine.delete_at.is_(None))
            )
        ).scalars().all()
    )

    issues: list[schemas.engine.BillingAuditIssue] = []
    for db_engine in db_engines:
        creator = db_engine.creator
        engine_provided = db_engine.engine_provided
        is_platform_owned = creator is not None and creator.role in (
            UserRole.ADMIN,
            UserRole.ROOT,
        )
        usage_info = usage_map.get(db_engine.uuid, {"count": 0, "charged_points": 0})
        has_usage = usage_info["count"] > 0
        charged_points = usage_info["charged_points"]

        if is_platform_owned and not bool(db_engine.is_official_hosted):
            severity = "high" if has_usage else "medium"
            issues.append(
                schemas.engine.BillingAuditIssue(
                    code="platform_engine_not_official_hosted",
                    severity=severity,
                    resource_id=db_engine.id,
                    resource_uuid=db_engine.uuid,
                    resource_name=db_engine.name,
                    provider_name=engine_provided.name if engine_provided is not None else None,
                    title="Platform engine is not marked as official hosted",
                    description=(
                        "This engine is platform-owned but is not marked as official hosted, "
                        "so it will not participate in compute-point charging."
                    ),
                )
            )

        if bool(db_engine.is_official_hosted) and float(db_engine.compute_point_multiplier or 1.0) <= 1.0:
            issues.append(
                schemas.engine.BillingAuditIssue(
                    code="official_hosted_engine_default_multiplier",
                    severity="low",
                    resource_id=db_engine.id,
                    resource_uuid=db_engine.uuid,
                    resource_name=db_engine.name,
                    provider_name=engine_provided.name if engine_provided is not None else None,
                    title="Official hosted engine still uses the default multiplier",
                    description=(
                        "This engine is marked as official hosted but still uses a 1.0 multiplier. "
                        "That may be intentional, but it is worth reviewing for higher-cost engines."
                    ),
                )
            )

        if is_platform_owned and has_usage and charged_points <= 0:
            issues.append(
                schemas.engine.BillingAuditIssue(
                    code="used_engine_without_compute_charge",
                    severity="high",
                    resource_id=db_engine.id,
                    resource_uuid=db_engine.uuid,
                    resource_name=db_engine.name,
                    provider_name=engine_provided.name if engine_provided is not None else None,
                    title="Used engine has not produced any compute-point charge",
                    description=(
                        "This engine already has usage records, but the accumulated charged points are still 0. "
                        "Please verify the official-hosted flag and multiplier configuration."
                    ),
                )
            )

    return schemas.engine.BillingAuditResponse(items=issues)

@engine_router.post("/create", response_model=schemas.common.NormalResponse)
async def create_engine(
    engine_create_request: schemas.engine.EngineCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    """创建引擎"""
    required_plan_level = int(
        normalize_plan_access_level(engine_create_request.required_plan_level)
    )
    db_engine = await crud.engine.create_engine_async(
        db=db,
        name=engine_create_request.name,
        description=engine_create_request.description,
        is_public=engine_create_request.is_public,
        required_plan_level=required_plan_level,
        is_official_hosted=engine_create_request.is_official_hosted,
        billing_mode=int(engine_create_request.billing_mode),
        billing_unit_price=engine_create_request.billing_unit_price,
        compute_point_multiplier=engine_create_request.compute_point_multiplier,
        config_json=engine_create_request.config_json,
        creator_id=user.id,
        engine_provided_id=engine_create_request.engine_provided_id
    )
    await crud.engine.create_user_engine_async(
        db=db,
        user_id=user.id,
        engine_id=db_engine.id,
        role=UserEngineRole.CREATOR
    )
    await db.commit()
    return schemas.common.SuccessResponse()

@engine_router.post("/community", response_model=schemas.pagination.InifiniteScrollPagnition[schemas.engine.EngineInfo])
async def search_document_parse_engine(
    engine_search_request: schemas.engine.CommunityEngineSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    """搜索当前所有我可以使用的引擎 包含我创建的和公开的
    """
    has_more = False
    next_start = None
    next_engine = None
    db_engines = await crud.engine.search_engines_for_user_async(
        db=db,
        user_id=user.id,
        keyword=engine_search_request.keyword,
        start=engine_search_request.start,
        limit=engine_search_request.limit,
    )
    if engine_search_request.limit > 0 and len(db_engines) == engine_search_request.limit:
        next_engine = await crud.engine.search_next_engine_for_user_async(
            db=db,
            user_id=user.id,
            engine=db_engines[-1][0],
            keyword=engine_search_request.keyword
        )
        has_more = next_engine is not None
        next_start = next_engine[0].id if next_engine is not None else None
    total = await crud.engine.count_all_engines_for_user_async(
        db=db,
        user_id=user.id,
        keyword=engine_search_request.keyword
    )
    data = []
    for item in db_engines:
        data.append(
            _serialize_engine_info(
                item[0],
                is_forked=await crud.engine.get_user_engine_by_user_id_and_engine_id_async(
                    db=db,
                    user_id=user.id,
                    engine_id=item[0].id,
                    filter_role=UserEngineRole.FORKER,
                ) is not None,
            )
        )
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=engine_search_request.start,
        limit=engine_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@engine_router.post("/usable", response_model=schemas.engine.UsableEnginesResponse)
async def search_usable_engine(
    engine_search_request: schemas.engine.UsableEngineSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    """搜索当前所有我配置好的引擎 我自己的和我fork的
    """
    data = []
    db_engines = await crud.engine.get_usable_engines_for_user_async(
        db=db,
        user_id=user.id,
        keyword=engine_search_request.keyword,
        filter_category=engine_search_request.filter_category
    )
    for db_engine in db_engines:
        if not db_engine.is_public and db_engine.creator_id != user.id:
            continue
        db_engine_provided = await crud.engine.get_engine_provided_by_engine_id_async(
            db=db,
            engine_id=db_engine.id
        )
        if db_engine_provided is None:
            continue
        data.append(
            _serialize_engine_info(
                db_engine,
                is_forked=await crud.engine.get_user_engine_by_user_id_and_engine_id_async(
                    db=db,
                    user_id=user.id,
                    engine_id=db_engine.id,
                    filter_role=UserEngineRole.FORKER,
                ) is not None,
            )
        )
    return schemas.engine.UsableEnginesResponse(data=data)

@engine_router.post('/detail', response_model=schemas.engine.EngineDetail)
async def get_engine_detail(
    engine_detail_request: schemas.engine.EngineDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_engine = await crud.engine.get_engine_by_engine_id_async(
        db=db,
        engine_id=engine_detail_request.engine_id
    )
    if db_engine is None:
        raise schemas.error.CustomException(code=404, message="Engine not found")
    db_engine_provided = await crud.engine.get_engine_provided_by_engine_id_async(
        db=db,
        engine_id=engine_detail_request.engine_id
    )
    if db_engine_provided is None:
        raise schemas.error.CustomException(code=404, message="This type of engine is not supported")

    if db_engine.creator_id != user.id:
        if not db_engine.is_public:
            raise schemas.error.CustomException(code=403, message="You don't have permission to access this engine")
        else:
            return _serialize_engine_detail(
                db_engine,
                include_config_json=False,
            )
    else:
        return _serialize_engine_detail(
            db_engine,
            include_config_json=True,
        )

@engine_router.post("/image-generate", response_model=schemas.engine.ImageGenerateResponse)
async def generate_image_with_default_engine(
    image_generate_request: schemas.engine.ImageGenerateRequest,
    user: models.user.User = Depends(get_current_user_short_lived),
):
    if not image_generate_request.prompt:
        raise schemas.error.CustomException(
            code=400,
            message="Prompt cannot be empty",
        )
    selected_engine_id = (
        image_generate_request.engine_id
        if image_generate_request.engine_id is not None
        else user.default_image_generate_engine_id
    )
    if selected_engine_id is None:
        raise schemas.error.CustomException(
            code=400,
            message="Default image generate engine is not configured",
        )

    async with async_session_context() as db:
        db_engine = await crud.engine.get_engine_by_engine_id_async(
            db=db,
            engine_id=selected_engine_id,
        )
        if db_engine is None:
            raise schemas.error.CustomException(
                message="Engine not found",
                code=404,
            )
        required_plan_level = db_engine.required_plan_level

    await ensure_required_plan_level_access(
        user=user,
        required_plan_level=required_plan_level,
    )

    engine = await EngineProxy.create_image_generate_engine(
        user_id=user.id,
        engine_id=selected_engine_id,
    )
    image_markdown = await engine.generate_image(image_generate_request.prompt)
    if image_markdown is None:
        raise schemas.error.CustomException(
            code=502,
            message="Image generation failed",
        )

    match = DATA_URL_PATTERN.search(image_markdown)
    if match is None:
        raise schemas.error.CustomException(
            code=502,
            message="Image generation returned an invalid payload",
        )

    return schemas.engine.ImageGenerateResponse(
        prompt=image_generate_request.prompt,
        image_markdown=image_markdown,
        data_url=match.group(0),
    )

@engine_router.post("/provided", response_model=schemas.engine.EngineProvidedSearchResponse)
async def provide_document_parse_engine(
    engine_search_request: schemas.engine.EngineProvidedSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_engines_provided = await crud.engine.get_all_engines_provided_async(
        db=db,
        keyword=engine_search_request.keyword,
        filter_category=engine_search_request.filter_category,
    )
    engines = [
        schemas.engine.EngineProvidedInfo.model_validate(db_engine_provided) 
        for db_engine_provided in db_engines_provided
    ]
    return schemas.engine.EngineProvidedSearchResponse(data=engines)

@engine_router.post("/fork", response_model=schemas.common.NormalResponse)
async def install_engine(
    engine_fork_request: schemas.engine.EngineForkRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    db_engine = await crud.engine.get_engine_by_engine_id_async(
        db=db,
        engine_id=engine_fork_request.engine_id,
    )
    if db_engine is None:
        raise schemas.error.CustomException(code=404, message="Engine not found")
    if db_engine.creator_id == current_user.id:
        raise schemas.error.CustomException(code=403, message="You can't fork your own engine")
    if not db_engine.is_public:
        raise schemas.error.CustomException(code=403, message="You can't fork a private engine")
    db_user_engine = await crud.engine.get_user_engine_by_user_id_and_engine_id_async(
        db=db,
        user_id=current_user.id,
        engine_id=engine_fork_request.engine_id,
        filter_role=UserEngineRole.FORKER
    )

    if db_user_engine is not None:
        if engine_fork_request.status:
            raise schemas.error.CustomException(code=403, message="You have forked this engine")
        else:
            db_user_engine.delete_at = now
            await db.commit()
            return schemas.common.SuccessResponse()
    else:
        if engine_fork_request.status:
            await _ensure_subscription_access(
                user=current_user,
                required_plan_level=db_engine.required_plan_level,
            )
            await crud.engine.create_user_engine_async(
                db=db,
                user_id=current_user.id,
                engine_id=engine_fork_request.engine_id,
                role=UserEngineRole.FORKER,
            )
        else:
            raise schemas.error.CustomException(code=403, message="You have not forked this engine")

    await db.commit()

    return schemas.common.SuccessResponse()

@engine_router.post("/delete", response_model=schemas.common.NormalResponse)
async def delete_engine(
    engine_delete_request: schemas.engine.EngineDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    
    db_engine = await crud.engine.get_engine_by_engine_id_async(
        db=db,
        engine_id=engine_delete_request.engine_id
    )
    if db_engine is None:
        raise schemas.error.CustomException(code=404, message="Engine not found")
    if db_engine.creator_id != user.id:
        raise schemas.error.CustomException(code=403, message="Permission denied")
    
    db_engine.delete_at = now
    
    db_user_engine = await crud.engine.get_user_engine_by_user_id_and_engine_id_async(
        db=db,
        user_id=user.id,
        engine_id=engine_delete_request.engine_id,
        filter_role=UserEngineRole.CREATOR
    )
    if db_user_engine is None:
        raise schemas.error.CustomException(code=403, message="Permission denied")

    db_user_engine.delete_at = now
    
    await db.commit()
    return schemas.common.SuccessResponse()

@engine_router.post("/update", response_model=schemas.common.NormalResponse)
async def update_engine(
    engine_update_request: schemas.engine.EngineUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    
    db_engine = await crud.engine.get_engine_by_engine_id_async(
        db=db,
        engine_id=engine_update_request.engine_id
    )
    if db_engine is None:
        raise schemas.error.CustomException(code=404, message="Engine not found")
    if db_engine.creator_id != user.id:
        raise schemas.error.CustomException(code=403, message="Permission denied")

    if engine_update_request.name is not None:
        db_engine.name = engine_update_request.name
    if engine_update_request.description is not None:
        db_engine.description = engine_update_request.description
    if engine_update_request.config_json is not None:
        db_engine.config_json = encrypt_engine_config(engine_update_request.config_json)
    if engine_update_request.is_public is not None:
        db_engine.is_public = engine_update_request.is_public
    if engine_update_request.required_plan_level is not None:
        db_engine.required_plan_level = int(
            normalize_plan_access_level(engine_update_request.required_plan_level)
        )
    if engine_update_request.is_official_hosted is not None:
        db_engine.is_official_hosted = engine_update_request.is_official_hosted
    if engine_update_request.billing_mode is not None:
        db_engine.billing_mode = int(engine_update_request.billing_mode)
    if engine_update_request.billing_unit_price is not None:
        db_engine.billing_unit_price = engine_update_request.billing_unit_price
    if engine_update_request.compute_point_multiplier is not None:
        db_engine.compute_point_multiplier = engine_update_request.compute_point_multiplier

    db_engine.update_time = now

    await db.commit()
    return schemas.common.SuccessResponse()
