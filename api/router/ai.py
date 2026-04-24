import base64
import json
import mimetypes
import time
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import httpx
from sqlalchemy import func, select
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langfuse import propagate_attributes
from mcp_use import MCPAgent, MCPClient
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

import crud
import models
import schemas
from common.common import safe_json_loads
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    get_current_user,
    get_current_user_short_lived,
    get_async_db,
    get_user_plan_level_in_func,
    plan_ability_checked_in_func,
)
from common.encrypt import encrypt_api_key
from common.interpret_event import EventInterpreter
from common.jwt_utils import create_token
from common.logger import exception_logger, format_log_message, info_logger
from common.subscription_access import (
    SUBSCRIPTION_REQUIRED_ERROR_MESSAGE,
    has_plan_level_access,
    is_subscription_required_level,
    normalize_plan_access_level,
)
from common.structured_mcp_adapter import StructuredLangChainAdapter
from common.usage_collector import UsageCollector
from common.usage_billing import persist_model_usage_from_snapshot
from data.sql.base import async_session_context
from enums.ability import Ability
from enums.mcp import MCPCategory
from enums.model import UserModelProviderRole
from enums.user import AIInteractionLanguage, UserRole
from proxy.ai_model_proxy import AIModelProxy
from proxy.file_system_proxy import FileSystemProxy
from schemas.ai import ChatItem

ai_router = APIRouter()
MCP_AGENT_MAX_STEPS = 12
SUBSCRIPTION_GATE_ENABLED = check_deployed_by_official_in_fuc()


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


def _serialize_model_provider(
    ai_model_provider: models.model.AIModelProvider,
    *,
    is_forked: bool | None = None,
) -> schemas.ai.ModelProvider:
    provider = schemas.ai.ModelProvider.model_validate(ai_model_provider)
    return provider.model_copy(
        update={
            "is_forked": is_forked,
        }
    )


def _serialize_model_provider_detail(
    ai_model_provider: models.model.AIModelProvider,
    *,
    include_sensitive: bool,
) -> schemas.ai.ModelProviderDetail:
    detail = schemas.ai.ModelProviderDetail.model_validate(ai_model_provider)
    update_payload: dict[str, Any] = {}
    if not include_sensitive:
        update_payload.update(
            {
                "api_key": None,
                "base_url": None,
            }
        )
    return detail.model_copy(update=update_payload)


def _serialize_model(
    ai_model: models.model.AIModel,
    *,
    is_forked: bool | None = None,
) -> schemas.ai.Model:
    required_plan_level = normalize_plan_access_level(ai_model.required_plan_level)
    model = schemas.ai.Model.model_validate(ai_model)
    return model.model_copy(
        update={
            "provider": _serialize_model_provider(
                ai_model.provider,
                is_forked=is_forked,
            ),
            "required_plan_level": int(required_plan_level),
            "subscription_required": is_subscription_required_level(
                required_plan_level,
            ),
        }
    )


def _is_graph_recursion_limit_error(exc: Exception) -> bool:
    error_message = str(exc)
    return (
        exc.__class__.__name__ == "GraphRecursionError"
        or "GRAPH_RECURSION_LIMIT" in error_message
        or "Recursion limit of" in error_message
    )


def _build_mcp_recursion_limit_notice_key(*, has_partial_answer: bool) -> str:
    if has_partial_answer:
        return "revornix_ai_notice_mcp_recursion_limit_incomplete"
    return "revornix_ai_notice_mcp_recursion_limit"


def _build_agent_error_message_key(*, is_recursion_limit: bool) -> str:
    if is_recursion_limit:
        return "revornix_ai_error_mcp_recursion_limit"
    return "revornix_ai_error_server_failed"


def _normalize_chat_images(image_paths: list[str] | None) -> list[str]:
    if not image_paths:
        return []
    return [path.strip() for path in image_paths if isinstance(path, str) and path.strip()]


def _build_data_url(*, mime_type: str, content: bytes) -> str:
    encoded = base64.b64encode(content).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _guess_image_mime_type(path: str) -> str:
    guessed, _ = mimetypes.guess_type(path)
    if guessed and guessed.startswith("image/"):
        return guessed
    return "image/png"


async def _resolve_chat_image_urls(*, user_id: int, image_paths: list[str]) -> list[str]:
    if not image_paths:
        return []

    file_service = await FileSystemProxy.create(user_id=user_id)
    resolved_urls: list[str] = []
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for path in image_paths:
            if path.startswith("data:image/"):
                resolved_urls.append(path)
                continue

            if path.startswith("http://") or path.startswith("https://"):
                response = await client.get(path)
                response.raise_for_status()
                mime_type = response.headers.get("Content-Type") or _guess_image_mime_type(path)
                resolved_urls.append(
                    _build_data_url(
                        mime_type=mime_type,
                        content=response.content,
                    )
                )
                continue

            content = await file_service.get_file_content_by_file_path(file_path=path)
            if isinstance(content, str):
                content = content.encode("utf-8")
            resolved_urls.append(
                _build_data_url(
                    mime_type=_guess_image_mime_type(path),
                    content=content,
                )
            )
    return resolved_urls


async def _build_human_message_with_images(
    *,
    user_id: int,
    text: str,
    image_paths: list[str] | None = None,
) -> HumanMessage:
    normalized_images = _normalize_chat_images(image_paths)
    if not normalized_images:
        return HumanMessage(content=text)

    resolved_urls = await _resolve_chat_image_urls(
        user_id=user_id,
        image_paths=normalized_images,
    )
    content_parts: list[dict[str, Any]] = []
    if text.strip():
        content_parts.append(
            {
                "type": "text",
                "text": text,
            }
        )
    content_parts.extend(
        {
            "type": "image_url",
            "image_url": {
                "url": image_url,
            },
        }
        for image_url in resolved_urls
    )
    return HumanMessage(content=content_parts)


@ai_router.post(
    "/model/billing-audit",
    response_model=schemas.ai.BillingAuditResponse,
)
async def inspect_model_billing_audit(
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
            .where(models.usage.UsageLedger.resource_type == "llm")
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

    db_models = list(
        (
            await db.execute(
                select(models.model.AIModel)
                .options(
                    joinedload(models.model.AIModel.provider).joinedload(models.model.AIModelProvider.creator)
                )
                .where(models.model.AIModel.delete_at.is_(None))
            )
        ).scalars().all()
    )

    issues: list[schemas.ai.BillingAuditIssue] = []
    for db_model in db_models:
        provider = db_model.provider
        creator = provider.creator if provider is not None else None
        is_platform_owned = creator is not None and creator.role in (
            UserRole.ADMIN,
            UserRole.ROOT,
        )
        usage_info = usage_map.get(db_model.uuid, {"count": 0, "charged_points": 0})
        has_usage = usage_info["count"] > 0
        charged_points = usage_info["charged_points"]

        if is_platform_owned and not bool(db_model.is_official_hosted):
            severity = "high" if has_usage else "medium"
            issues.append(
                schemas.ai.BillingAuditIssue(
                    code="platform_model_not_official_hosted",
                    severity=severity,
                    resource_id=db_model.id,
                    resource_uuid=db_model.uuid,
                    resource_name=db_model.name,
                    provider_name=provider.name if provider is not None else None,
                    title="Platform model is not marked as official hosted",
                    description=(
                        "This model belongs to a platform-owned provider but is not marked as official hosted, "
                        "so it will not participate in compute-point charging."
                    ),
                )
            )

        if bool(db_model.is_official_hosted) and float(db_model.compute_point_multiplier or 1.0) <= 1.0:
            issues.append(
                schemas.ai.BillingAuditIssue(
                    code="official_hosted_model_default_multiplier",
                    severity="low",
                    resource_id=db_model.id,
                    resource_uuid=db_model.uuid,
                    resource_name=db_model.name,
                    provider_name=provider.name if provider is not None else None,
                    title="Official hosted model still uses the default multiplier",
                    description=(
                        "This model is marked as official hosted but still uses a 1.0 multiplier. "
                        "That may be intentional, but it is worth reviewing if the model has above-average cost."
                    ),
                )
            )

        if is_platform_owned and has_usage and charged_points <= 0:
            issues.append(
                schemas.ai.BillingAuditIssue(
                    code="used_model_without_compute_charge",
                    severity="high",
                    resource_id=db_model.id,
                    resource_uuid=db_model.uuid,
                    resource_name=db_model.name,
                    provider_name=provider.name if provider is not None else None,
                    title="Used model has not produced any compute-point charge",
                    description=(
                        "This model already has usage records, but the accumulated charged points are still 0. "
                        "Please verify the official-hosted flag and multiplier configuration."
                    ),
                )
            )

    return schemas.ai.BillingAuditResponse(items=issues)

@ai_router.post("/model/create", response_model=schemas.ai.ModelCreateResponse)
async def create_model(
    model_create_request: schemas.ai.ModelCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    required_plan_level = int(
        normalize_plan_access_level(model_create_request.required_plan_level)
    )
    db_model_provider = await crud.model.get_ai_model_provider_by_id_async(
        db=db,
        provider_id=model_create_request.provider_id
    )
    if db_model_provider is None:
        raise schemas.error.CustomException("Model provider not found", code=404)
    if db_model_provider.creator_id != user.id:
        raise schemas.error.CustomException("You don't have permission to add models to this provider", code=403)

    db_ai_model = await crud.model.create_ai_model_async(
        db=db,
        name=model_create_request.name,
        description=model_create_request.description,
        required_plan_level=required_plan_level,
        provider_id=model_create_request.provider_id,
        is_official_hosted=model_create_request.is_official_hosted,
        compute_point_multiplier=model_create_request.compute_point_multiplier,
    )
    await db.commit()
    return schemas.ai.ModelCreateResponse(id=db_ai_model.id)

@ai_router.post("/model/detail", response_model=schemas.ai.Model)
async def get_ai_model(
    model_request: schemas.ai.ModelRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    ai_model = await crud.model.get_ai_model_by_id_async(
        db=db,
        model_id=model_request.model_id
    )
    if ai_model is None:
        raise schemas.error.CustomException("Model not found", code=404)

    ai_model_provider = await crud.model.get_ai_model_provider_by_id_async(
        db=db,
        provider_id=ai_model.provider_id
    )
    if ai_model_provider is None:
        raise schemas.error.CustomException("Model provider not found for this model", code=404)

    is_forked = None
    if ai_model_provider.creator_id == user.id:
        is_forked = False
    elif ai_model_provider.is_public:
        is_forked = (
            await crud.model.get_user_ai_model_provider_by_user_and_model_provider_id_async(
                db=db,
                user_id=user.id,
                ai_model_provider_id=ai_model_provider.id,
                filter_role=UserModelProviderRole.FORKER,
            )
            is not None
        )
    else:
        raise schemas.error.CustomException("You don't have permission to access this model", code=403)

    return _serialize_model(
        ai_model,
        is_forked=is_forked,
    )

@ai_router.post("/model-provider/create", response_model=schemas.ai.ModelProviderCreateResponse)
async def create_model_provider(
    model_provider_request: schemas.ai.ModelProviderCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_ai_model_provider = await crud.model.create_ai_model_provider_async(
        db=db,
        name=model_provider_request.name,
        description=model_provider_request.description,
        creator_id=user.id,
        api_key=model_provider_request.api_key,
        base_url=model_provider_request.base_url,
        is_public=model_provider_request.is_public
    )
    await crud.model.create_user_ai_model_provider_async(
        db=db,
        user_id=user.id,
        ai_model_provider_id=db_ai_model_provider.id,
        role=UserModelProviderRole.CREATOR
    )
    await db.commit()
    return schemas.ai.ModelProviderCreateResponse(id=db_ai_model_provider.id)

# 只有创建者能获取到模型的完整配置 否则即使公开 其他用户也只能获取到除密钥和url以外的信息
@ai_router.post("/model-provider/detail", response_model=schemas.ai.ModelProviderDetail)
async def get_ai_model_provider(
    model_provider_request: schemas.ai.ModelProviderRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    ai_model_provider = await crud.model.get_ai_model_provider_by_id_async(
        db=db,
        provider_id=model_provider_request.provider_id
    )
    if ai_model_provider is None:
        raise schemas.error.CustomException("Model provider not found", code=404)

    if ai_model_provider.creator_id == user.id:
        return _serialize_model_provider_detail(
            ai_model_provider,
            include_sensitive=True,
        )

    if not ai_model_provider.is_public:
        raise schemas.error.CustomException("You don't have permission to access this private model provider", code=403)

    return _serialize_model_provider_detail(
        ai_model_provider,
        include_sensitive=False,
    )

@ai_router.post("/model/delete", response_model=schemas.common.NormalResponse)
async def delete_ai_model(
    delete_model_request: schemas.ai.DeleteModelRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)

    for model_id in delete_model_request.model_ids:
        db_model = await crud.model.get_ai_model_by_id_async(
            db=db,
            model_id=model_id
        )
        if db_model is None:
            raise schemas.error.CustomException("Model not found", code=404)
        db_model_provider = await crud.model.get_ai_model_provider_by_id_async(
            db=db,
            provider_id=db_model.provider_id
        )
        if db_model_provider is None:
            raise schemas.error.CustomException("Model provider metadata is missing for this model", code=500)
        if db_model_provider.creator_id != user.id:
            raise schemas.error.CustomException("You don't have permission to delete this model", code=403)
        db_model.delete_at = now

    if user.default_revornix_model_id in delete_model_request.model_ids:
        user.default_revornix_model_id = None
    if user.default_document_reader_model_id in delete_model_request.model_ids:
        user.default_document_reader_model_id = None
    await db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model-provider/delete", response_model=schemas.common.NormalResponse)
async def delete_ai_model_provider(
    delete_model_request: schemas.ai.DeleteModelProviderRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    now = datetime.now(tz=timezone.utc)

    db_model_provider = await crud.model.get_ai_model_provider_by_id_async(
        db=db,
        provider_id=delete_model_request.provider_id
    )
    if db_model_provider is None:
        raise schemas.error.CustomException("Model provider not found", code=404)
    if db_model_provider.creator_id != user.id:
        raise schemas.error.CustomException("You don't have permission to delete this model provider", code=403)

    db_models = await crud.model.get_ai_models_for_ai_model_provider_async(
        db=db,
        provider_id=delete_model_request.provider_id
    )
    for db_model in db_models:
        db_model.delete_at = now

    db_model_provider.delete_at = now

    db_model_ids = [
        model.id for model in db_models
    ]
    if user.default_revornix_model_id in db_model_ids:
        user.default_revornix_model_id = None
    if user.default_document_reader_model_id in db_model_ids:
        user.default_document_reader_model_id = None
    await db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model-provider/community", response_model=schemas.pagination.InifiniteScrollPagnition[schemas.ai.ModelProvider])
async def list_ai_model_provider(
    model_provider_search_request: schemas.ai.ModelProviderSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    """搜索当前所有我可以使用的模型供应商 包含我创建的和公开的
    """
    has_more = False
    next_start = None
    next_model_provider = None
    db_ai_model_providers = await crud.model.search_ai_model_providers_for_user_async(
        db=db,
        user_id=user.id,
        keyword=model_provider_search_request.keyword,
        start=model_provider_search_request.start,
        limit=model_provider_search_request.limit,
    )
    if (
        model_provider_search_request.limit > 0
        and len(db_ai_model_providers) == model_provider_search_request.limit
    ):
        next_model_provider = await crud.model.search_next_ai_model_providers_for_user_async(
            db=db,
            user_id=user.id,
            provider=db_ai_model_providers[-1][0],
            keyword=model_provider_search_request.keyword
        )
        has_more = next_model_provider is not None
        next_start = next_model_provider[0].id if next_model_provider is not None else None
    total = await crud.model.count_all_ai_model_providers_for_user_async(
        db=db,
        user_id=user.id,
        keyword=model_provider_search_request.keyword
    )
    data = [
        _serialize_model_provider(
            item[0],
            is_forked=item[1] is not None and item[1].role == UserModelProviderRole.FORKER,
        )
        for item in db_ai_model_providers
    ]
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=model_provider_search_request.start,
        limit=model_provider_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

# 将对应的model provider加入自己的备选区
@ai_router.post("/model-provider/fork", response_model=schemas.common.NormalResponse)
async def fork_ai_model_provider(
    model_provider_fork_request: schemas.ai.ModelProviderForkRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    db_ai_model_provider = await crud.model.get_ai_model_provider_by_id_async(
        db=db,
        provider_id=model_provider_fork_request.provider_id
    )
    if db_ai_model_provider is None:
        raise schemas.error.CustomException("Model provider not found", code=404)
    if db_ai_model_provider.creator_id != user.id and not db_ai_model_provider.is_public:
        raise schemas.error.CustomException("You can't fork a private model provider", code=403)

    if db_ai_model_provider.creator_id == user.id:
        raise schemas.error.CustomException("You can't fork your own model provider", code=403)
    db_user_ai_model_provider = await crud.model.get_user_ai_model_provider_by_user_and_model_provider_id_async(
        db=db,
        user_id=user.id,
        ai_model_provider_id=model_provider_fork_request.provider_id,
        filter_role=UserModelProviderRole.FORKER
    )
    if db_user_ai_model_provider is not None:
        if model_provider_fork_request.status:
            raise schemas.error.CustomException("Model provider is already forked", code=403)
        db_user_ai_model_provider.delete_at = now
    else:
        if not model_provider_fork_request.status:
            raise schemas.error.CustomException("Model provider is not forked", code=403)
        await crud.model.create_user_ai_model_provider_async(
            db=db,
            user_id=user.id,
            ai_model_provider_id=model_provider_fork_request.provider_id,
            role=UserModelProviderRole.FORKER
        )
    await db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model/search", response_model=schemas.ai.ModelSearchResponse)
async def list_ai_model(
    model_search_request: schemas.ai.ModelSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    data = []
    # 如果传递了provider_id 那么就获取该provider目录下的所有模型
    if model_search_request.provider_id is not None:
        db_ai_model_provider = await crud.model.get_ai_model_provider_by_id_async(
            db=db,
            provider_id=model_search_request.provider_id
        )
        if db_ai_model_provider is None:
            raise schemas.error.CustomException("Model provider not found", code=404)
        if db_ai_model_provider.creator_id != user.id and not db_ai_model_provider.is_public:
            raise schemas.error.CustomException("You don't have permission to access this private model provider", code=403)
        db_models = await crud.model.get_ai_models_for_ai_model_provider_async(
            db=db,
            provider_id=model_search_request.provider_id
        )
        is_forked = (
            await crud.model.get_user_ai_model_provider_by_user_and_model_provider_id_async(
                db=db,
                user_id=user.id,
                ai_model_provider_id=db_ai_model_provider.id,
                filter_role=UserModelProviderRole.FORKER,
            )
            is not None
        )
        for db_model in db_models:
            data.append(
                _serialize_model(
                    db_model,
                    is_forked=is_forked,
                )
            )
    # 如果没有传递 那就获取当前用户所有可用模型
    else:
        db_ai_model_providers = await crud.model.get_ai_model_providers_for_user_async(
            db=db,
            user_id=user.id,
            keyword=model_search_request.keyword
        )
        model_provider_ids = [provider.id for provider in db_ai_model_providers]
        models_by_provider: dict[int, list[models.model.AIModel]] = {provider_id: [] for provider_id in model_provider_ids}
        if model_provider_ids:
            db_models = list(
                (
                    await db.execute(
                        select(models.model.AIModel)
                        .options(joinedload(models.model.AIModel.provider))
                        .where(
                            models.model.AIModel.provider_id.in_(model_provider_ids),
                            models.model.AIModel.delete_at.is_(None),
                        )
                    )
                ).scalars().all()
            )
            for db_model in db_models:
                models_by_provider.setdefault(db_model.provider_id, []).append(db_model)
        forked_provider_ids = {
            binding.ai_model_provider_id
            for binding in (
                await db.execute(
                    select(models.model.UserAIModelProvider).where(
                        models.model.UserAIModelProvider.user_id == user.id,
                        models.model.UserAIModelProvider.ai_model_provider_id.in_(model_provider_ids or [-1]),
                        models.model.UserAIModelProvider.role == UserModelProviderRole.FORKER,
                        models.model.UserAIModelProvider.delete_at.is_(None),
                    )
                )
            ).scalars().all()
        }
        for db_ai_model_provider in db_ai_model_providers:
            if not db_ai_model_provider.is_public and db_ai_model_provider.creator_id != user.id:
                continue
            is_forked = db_ai_model_provider.id in forked_provider_ids
            for db_model in models_by_provider.get(db_ai_model_provider.id, []):
                data.append(
                    _serialize_model(
                        db_model,
                        is_forked=is_forked,
                    )
                )

    return schemas.ai.ModelSearchResponse(data=data)

@ai_router.post("/model/update", response_model=schemas.common.NormalResponse)
async def update_ai_model(
    model_update_request: schemas.ai.ModelUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    db_ai_model = await crud.model.get_ai_model_by_id_async(
        db=db,
        model_id=model_update_request.id
    )
    if db_ai_model is None:
        raise schemas.error.CustomException("Model not found", code=404)
    db_ai_model_provider = await crud.model.get_ai_model_provider_by_id_async(
        db=db,
        provider_id=db_ai_model.provider_id
    )
    if db_ai_model_provider is None:
        raise schemas.error.CustomException("Model provider metadata is missing for this model", code=500)
    if db_ai_model_provider.creator_id != user.id:
        raise schemas.error.CustomException("You don't have permission to update this model", code=403)

    if model_update_request.name is not None:
        db_ai_model.name = model_update_request.name
    if model_update_request.description is not None:
        db_ai_model.description = model_update_request.description
    if model_update_request.required_plan_level is not None:
        db_ai_model.required_plan_level = int(
            normalize_plan_access_level(model_update_request.required_plan_level)
        )
    if model_update_request.is_official_hosted is not None:
        db_ai_model.is_official_hosted = model_update_request.is_official_hosted
    if model_update_request.compute_point_multiplier is not None:
        db_ai_model.compute_point_multiplier = model_update_request.compute_point_multiplier
    db_ai_model.update_time = now
    await db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model-provider/update", response_model=schemas.common.NormalResponse)
async def update_ai_model_provider(
    model_provider_update_request: schemas.ai.ModelProviderUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    db_ai_model_provider = await crud.model.get_ai_model_provider_by_id_async(
        db=db,
        provider_id=model_provider_update_request.id
    )
    if db_ai_model_provider is None:
        raise schemas.error.CustomException("Model provider not found", code=404)
    if db_ai_model_provider.creator_id != user.id:
        raise schemas.error.CustomException("You don't have permission to update this model provider", code=403)

    if model_provider_update_request.name is not None:
        db_ai_model_provider.name = model_provider_update_request.name
    if model_provider_update_request.description is not None:
        db_ai_model_provider.description = model_provider_update_request.description
    db_ai_model_provider.update_time = now
    if model_provider_update_request.api_key is not None:
        db_ai_model_provider.api_key = encrypt_api_key(model_provider_update_request.api_key)
    if model_provider_update_request.base_url is not None:
        db_ai_model_provider.base_url = model_provider_update_request.base_url
    if model_provider_update_request.is_public is not None:
        db_ai_model_provider.is_public = model_provider_update_request.is_public
    db_ai_model_provider.update_time = now

    await db.commit()
    return schemas.common.SuccessResponse()

async def create_agent(
    user_id: int,
    enable_mcp: bool = False,
    model_id: int | None = None,
):
    """Create an MCP agent with Revornix auth rules and structured tool artifacts."""
    try:
        async with async_session_context() as db:
            user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=user_id,
            )
            if user is None:
                raise schemas.error.CustomException("User not found", code=404)
            resolved_model_id = model_id if model_id is not None else user.default_revornix_model_id
            if resolved_model_id is None:
                raise schemas.error.CustomException("The user has not set a default model", code=400)
            access_token, _ = create_token(
                user=user
            )

        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=resolved_model_id
        )).get_configuration()

        api_key = SecretStr(model_configuration.api_key if model_configuration.api_key is not None else "")
        base_url = model_configuration.base_url

        mcp_client = MCPClient()
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.MCP_CLIENT.value,
            authorization=f'Bearer {access_token}'
        )
        deployed_by_official_in_func = check_deployed_by_official_in_fuc()
        mcp_enabled = False
        if enable_mcp:
            if not deployed_by_official_in_func:
                mcp_enabled = True
            else:
                mcp_enabled = auth_status
        if mcp_enabled:
            async with async_session_context() as db:
                mcp_servers = await crud.mcp.search_mcp_servers_async(
                    db=db,
                    user_id=user_id,
                )
                for mcp_server in mcp_servers:
                    if not mcp_server.enable:
                        continue
                    if mcp_server.category == MCPCategory.STD:
                        stdio_mcp_server = await crud.mcp.get_std_mcp_server_by_base_server_id_async(
                            db=db,
                            base_server_id=mcp_server.id,
                        )
                        if stdio_mcp_server is None:
                            continue
                        mcp_client.add_server(
                            name=mcp_server.name,
                            server_config={
                                "command": stdio_mcp_server.cmd,
                                "args": safe_json_loads(stdio_mcp_server.args, []),
                                "env": safe_json_loads(stdio_mcp_server.env, {})
                            }
                        )
                    if mcp_server.category == MCPCategory.HTTP:
                        http_mcp_server = await crud.mcp.get_http_mcp_server_by_base_server_id_async(
                            db=db,
                            base_server_id=mcp_server.id,
                        )
                        if http_mcp_server is None:
                            continue
                        mcp_client.add_server(
                            name=mcp_server.name,
                            server_config={
                                "url": http_mcp_server.url,
                                "headers": safe_json_loads(http_mcp_server.headers, {})
                            }
                        )
        llm = ChatOpenAI(
            model=model_configuration.model_name,
            api_key=api_key,
            base_url=base_url,
            # Ensure token usage is included in streaming events when provider supports it.
            stream_usage=True,
        )
        agent = MCPAgent(llm=llm, client=mcp_client, max_steps=MCP_AGENT_MAX_STEPS)
        agent.adapter = StructuredLangChainAdapter(disallowed_tools=agent.disallowed_tools)
        agent.adapter._record_telemetry = False
        return agent, resolved_model_id
    except Exception as e:
        exception_logger.error(
            format_log_message("ai_agent_create_failed", user_id=user_id, error=e)
        )
        raise


def _build_ai_language_instruction(language: int | None) -> str:
    if language == AIInteractionLanguage.CHINESE:
        return (
            "Always answer in Simplified Chinese unless the user explicitly asks "
            "you to switch to another language."
        )
    if language == AIInteractionLanguage.ENGLISH:
        return (
            "Always answer in English unless the user explicitly asks "
            "you to switch to another language."
        )
    return (
        "Reply in the same language as the latest user message when it is clear. "
        "If the latest message does not provide a clear language signal, follow "
        "the dominant language of the conversation."
    )


def _apply_agent_system_prompt(*, agent: MCPAgent, system_prompt: str) -> None:
    agent.system_prompt = system_prompt
    agent._system_message = SystemMessage(content=system_prompt)
    if hasattr(agent, "_create_agent"):
        agent._agent_executor = agent._create_agent()

async def stream_ops_with_agent(
    user_id: int,
    model_id: int,
    agent: MCPAgent,
    messages: list[ChatItem],
    system_prompt: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream a general Revornix AI response through the MCP agent pipeline."""
    interpreter = EventInterpreter()
    usage_collector = UsageCollector()
    chat_id = uuid4().hex
    stream_failed = False
    emitted_text_output = False

    try:
        # ==========================
        # 1️⃣ 初始化上下文
        # ==========================
        agent.clear_conversation_history()
        if system_prompt:
            _apply_agent_system_prompt(agent=agent, system_prompt=system_prompt)

        latest_message = messages.pop()
        query_message = await _build_human_message_with_images(
            user_id=user_id,
            text=latest_message.content,
            image_paths=latest_message.images,
        )
        for message in messages:
            if message.role == "user":
                agent.add_to_history(
                    await _build_human_message_with_images(
                        user_id=user_id,
                        text=message.content,
                        image_paths=message.images,
                    )
                )
            elif message.role == "assistant":
                agent.add_to_history(AIMessage(content=message.content))

        # ==========================
        # 2️⃣ 开始流式执行
        # ==========================
        with propagate_attributes(
            user_id=str(user_id),
            tags=[f"model:{agent._model_name}"],
        ):

            async for raw_event in agent.stream_events(query=query_message):
                raw_event_dict = dict(raw_event)
                if raw_event_dict.get("event") == "on_chat_model_end":
                    usage_collector.collect(raw_event_dict)
                    event_usage_snapshot = usage_collector.snapshot()
                    if event_usage_snapshot is not None:
                        info_logger.info(
                            format_log_message(
                                "ai_mcp_usage_collected",
                                user_id=user_id,
                                chat_id=chat_id,
                                usage=event_usage_snapshot,
                            )
                        )
                    else:
                        raw_data = raw_event_dict.get("data")
                        data_keys = list(raw_data.keys()) if isinstance(raw_data, dict) else []
                        info_logger.warning(
                            format_log_message(
                                "ai_mcp_usage_missing",
                                user_id=user_id,
                                chat_id=chat_id,
                                data_keys=data_keys,
                            )
                        )
                # 🔥 核心：解释 LangGraph / MCP 事件
                for interpreted in interpreter.interpret(
                    event=raw_event_dict,
                    chat_id=chat_id
                ):
                    if not interpreted:
                        continue
                    if (
                        interpreted.get("type") == "output"
                        and isinstance(interpreted.get("payload"), dict)
                        and interpreted["payload"].get("kind") == "token"
                        and interpreted["payload"].get("content")
                    ):
                        emitted_text_output = True

                    yield _sse(interpreted)

    except Exception as e:
        stream_failed = True
        # ==========================
        # 3️⃣ 错误事件
        # ==========================
        exception_logger.error(
            format_log_message(
                "ai_stream_failed",
                user_id=user_id,
                chat_id=chat_id,
                error=e,
            )
        )
        usage_snapshot = usage_collector.snapshot()
        is_recursion_limit = _is_graph_recursion_limit_error(e)

        if is_recursion_limit:
            yield _sse(
                {
                    "chat_id": chat_id,
                    "type": "output",
                    "timestamp": time.time(),
                    "trace": {},
                    "payload": {
                        "kind": "system_text",
                        "message": _build_mcp_recursion_limit_notice_key(
                            has_partial_answer=emitted_text_output,
                        ),
                        "paragraph_break": emitted_text_output,
                    },
                }
            )

        payload: dict[str, Any] = {
            "code": "MCP_RECURSION_LIMIT" if is_recursion_limit else "SERVER_ERROR",
            "message": _build_agent_error_message_key(
                is_recursion_limit=is_recursion_limit,
            ),
        }
        if usage_snapshot is not None:
            payload["usage"] = usage_snapshot
        yield _sse(
            {
                "chat_id": chat_id,
                "type": "error",
                "timestamp": time.time(),
                "trace": {},
                "payload": payload,
            }
        )

    # ==========================
    # 4️⃣ 完成事件
    # ==========================
    usage_snapshot = usage_collector.snapshot()
    if usage_snapshot is not None:
        info_logger.info(
            format_log_message(
                "ai_usage_summary",
                user_id=user_id,
                chat_id=chat_id,
                usage=usage_snapshot,
            )
        )
        persist_model_usage_from_snapshot(
            user_id=user_id,
            model_id=model_id,
            snapshot=usage_snapshot,
            source="ask_ai_stream",
            idempotency_key=f"ask_ai:{chat_id}",
        )

    if stream_failed:
        return

    done_payload: dict[str, object] = {"success": True}
    if usage_snapshot is not None:
        done_payload["usage"] = usage_snapshot

    yield _sse(
        {
            "chat_id": chat_id,
            "type": "done",
            "timestamp": time.time(),
            "trace": {},
            "payload": done_payload,
        }
    )

def _sse(event: dict) -> str:
    """
    SSE 格式统一出口
    """
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

@ai_router.post("/ask")
async def ask_ai(
    chat_messages: schemas.ai.ChatMessages,
    user: models.user.User = Depends(get_current_user_short_lived),
):
    """Handle Revornix AI chat requests with optional MCP tool usage."""
    messages = [
        message
        for message in chat_messages.messages
        if message.role in {"user", "assistant"}
    ]

    selected_model_id = (
        chat_messages.model_id
        if chat_messages.model_id is not None
        else user.default_revornix_model_id
    )
    if selected_model_id is None:
        raise schemas.error.CustomException(
            "The user has not set a default model",
            code=400,
        )
    if not messages:
        raise schemas.error.CustomException("Messages cannot be empty", code=400)
    if messages[-1].role != "user":
        raise schemas.error.CustomException(
            "The latest message must be from the user",
            code=400,
        )
    if not messages[-1].content.strip() and not _normalize_chat_images(messages[-1].images):
        raise schemas.error.CustomException(
            "The latest message must include text or images",
            code=400,
        )

    try:
        agent, model_id = await create_agent(
            user_id=user.id,
            enable_mcp=chat_messages.enable_mcp,
            model_id=selected_model_id,
        )
    except Exception as e:
        raise schemas.error.CustomException(
            message=str(e),
            code=400
        ) from e
    return StreamingResponse(
        stream_ops_with_agent(
            user_id=user.id,
            model_id=model_id,
            agent=agent,
            messages=messages,
            system_prompt=_build_ai_language_instruction(
                user.default_ai_interaction_language,
            ),
        ),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
