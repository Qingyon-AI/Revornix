from __future__ import annotations

import json
from collections.abc import Mapping
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import crud
import httpx
from common.logger import exception_logger, format_log_message
from common.jwt_utils import create_token
from config.base import UNION_PAY_API_PREFIX
from data.sql.base import async_session_context
from enums.billing import EngineBillingMode
from enums.engine_enums import Engine
from sqlalchemy.ext.asyncio import AsyncSession


def _normalize_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _shift_year_month(year: int, month: int, delta: int) -> tuple[int, int]:
    index = (year * 12 + (month - 1)) + delta
    return index // 12, index % 12 + 1


def _last_day_of_month(year: int, month: int) -> int:
    next_year, next_month = _shift_year_month(year, month, 1)
    start_next_month = datetime(next_year, next_month, 1, tzinfo=timezone.utc)
    end_of_month = start_next_month - timedelta(days=1)
    return end_of_month.day


def _build_anchor_boundary(*, year: int, month: int, anchor_day: int) -> datetime:
    day = min(anchor_day, _last_day_of_month(year, month))
    return datetime(year, month, day, tzinfo=timezone.utc)


def get_cycle_window(
    at: datetime | None = None,
    *,
    cycle_anchor_at: datetime | None = None,
) -> tuple[datetime, datetime]:
    now = at or datetime.now(timezone.utc)
    now = _normalize_utc(now)

    if cycle_anchor_at is None:
        start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        next_year, next_month = _shift_year_month(start.year, start.month, 1)
        end = datetime(next_year, next_month, 1, tzinfo=timezone.utc)
        return start, end

    anchor = _normalize_utc(cycle_anchor_at)
    anchor_boundary = datetime(anchor.year, anchor.month, anchor.day, tzinfo=timezone.utc)
    if now < anchor_boundary:
        next_year, next_month = _shift_year_month(anchor.year, anchor.month, 1)
        return anchor_boundary, _build_anchor_boundary(
            year=next_year,
            month=next_month,
            anchor_day=anchor.day,
        )

    candidate = _build_anchor_boundary(
        year=now.year,
        month=now.month,
        anchor_day=anchor.day,
    )
    if now >= candidate:
        start = candidate
    else:
        prev_year, prev_month = _shift_year_month(now.year, now.month, -1)
        start = _build_anchor_boundary(
            year=prev_year,
            month=prev_month,
            anchor_day=anchor.day,
        )
    next_year, next_month = _shift_year_month(start.year, start.month, 1)
    end = _build_anchor_boundary(
        year=next_year,
        month=next_month,
        anchor_day=anchor.day,
    )
    return start, end


def get_cycle_month(
    at: datetime | None = None,
    *,
    cycle_anchor_at: datetime | None = None,
) -> str:
    start, _ = get_cycle_window(at, cycle_anchor_at=cycle_anchor_at)
    return start.strftime("%Y-%m")


def normalize_usage_details(usage_details: Mapping[str, Any] | None) -> dict[str, int]:
    if not usage_details:
        return {}

    aliases = {
        "prompt_tokens": "input_tokens",
        "completion_tokens": "output_tokens",
        "input_text_tokens": "input_tokens",
        "output_text_tokens": "output_tokens",
    }
    normalized: dict[str, int] = {}
    for key, value in usage_details.items():
        if isinstance(value, bool):
            continue
        if not isinstance(value, (int, float)):
            continue
        canonical_key = aliases.get(str(key), str(key))
        normalized[canonical_key] = normalized.get(canonical_key, 0) + int(value)

    if "total_tokens" not in normalized:
        token_total = sum(
            int(value)
            for key, value in normalized.items()
            if key.endswith("_tokens") and key != "total_tokens"
        )
        if token_total > 0:
            normalized["total_tokens"] = token_total

    return normalized


def calculate_billable_points(usage_details: Mapping[str, int]) -> int:
    if not usage_details:
        return 0

    token_keys = [
        key
        for key in usage_details.keys()
        if key.endswith("_tokens") and key != "total_tokens"
    ]
    if token_keys:
        return max(sum(max(int(usage_details.get(key, 0)), 0) for key in token_keys), 0)

    if "total_tokens" in usage_details:
        return max(int(usage_details["total_tokens"]), 0)
    if "total" in usage_details:
        return max(int(usage_details["total"]), 0)

    return max(sum(max(int(value), 0) for value in usage_details.values()), 0)


def calculate_engine_billable_units(
    *,
    usage_details: Mapping[str, int],
    billing_mode: int | EngineBillingMode | None,
) -> int:
    mode = EngineBillingMode(int(billing_mode or EngineBillingMode.TOKEN))
    if mode == EngineBillingMode.TOKEN:
        return calculate_billable_points(usage_details)

    aliases: dict[EngineBillingMode, tuple[str, ...]] = {
        EngineBillingMode.REQUEST: ("request_count", "requests", "total_requests"),
        EngineBillingMode.FILE: ("file_count", "files", "total_files"),
        EngineBillingMode.PAGE: ("page_count", "pages", "total_pages"),
        EngineBillingMode.CHARACTER: (
            "character_count",
            "characters",
            "input_characters",
            "output_characters",
        ),
        EngineBillingMode.SECOND: (
            "duration_seconds",
            "audio_seconds",
            "seconds",
            "total_seconds",
        ),
        EngineBillingMode.IMAGE: ("image_count", "images", "total_images"),
    }
    keys = aliases.get(mode, ())
    return max(
        sum(max(int(usage_details.get(key, 0)), 0) for key in keys),
        0,
    )


def extract_usage_details_from_completion(completion: Any) -> dict[str, int] | None:
    usage_obj: Any = None
    if isinstance(completion, Mapping):
        usage_obj = completion.get("usage")
    else:
        usage_obj = getattr(completion, "usage", None)

    if usage_obj is None:
        return None

    usage_mapping: Mapping[str, Any] | None = None
    if isinstance(usage_obj, Mapping):
        usage_mapping = usage_obj
    else:
        model_dump = getattr(usage_obj, "model_dump", None)
        if callable(model_dump):
            dumped = model_dump(exclude_none=True)
            if isinstance(dumped, Mapping):
                usage_mapping = dumped
        if usage_mapping is None:
            dict_method = getattr(usage_obj, "dict", None)
            if callable(dict_method):
                dumped = dict_method()
                if isinstance(dumped, Mapping):
                    usage_mapping = dumped
        if usage_mapping is None and hasattr(usage_obj, "__dict__"):
            raw = {
                key: value
                for key, value in vars(usage_obj).items()
                if not key.startswith("_")
            }
            if raw:
                usage_mapping = raw

    if usage_mapping is None:
        return None

    normalized = normalize_usage_details(usage_mapping)
    return normalized or None


def extract_usage_details_from_snapshot(snapshot: Mapping[str, Any] | None) -> dict[str, int] | None:
    if not snapshot:
        return None
    usage = snapshot.get("usage")
    if not isinstance(usage, Mapping):
        return None
    normalized = normalize_usage_details(usage)
    return normalized or None


async def persist_model_usage(
    *,
    user_id: int,
    model_id: int,
    usage_details: Mapping[str, Any] | None,
    source: str,
    strict: bool = False,
    idempotency_key: str | None = None,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    normalized = normalize_usage_details(usage_details)
    if not normalized:
        return 0

    key = idempotency_key or f"{source}:{uuid4().hex}"
    try:
        async with async_session_context() as db:
            charged_points = await _resolve_model_charge_points(
                db=db,
                model_id=model_id,
                raw_points=calculate_billable_points(normalized),
            )
            billable_points = await record_model_usage(
                db=db,
                user_id=user_id,
                model_id=model_id,
                usage_details=normalized,
                charged_points=charged_points,
                source=source,
                idempotency_key=key,
                at=at,
                cycle_anchor_at=cycle_anchor_at,
            )
            await _consume_charged_points(
                user_id=user_id,
                charged_points=charged_points,
                reason="Official LLM usage",
                source="llm-usage",
                idempotency_key=f"compute:{key}",
            )
            await db.commit()
            return billable_points
    except Exception as e:
        exception_logger.error(
            format_log_message(
                "model_usage_persist_failed",
                user_id=user_id,
                model_id=model_id,
                source=source,
                error=e,
            )
        )
        if strict:
            raise
        return 0


async def persist_model_usage_from_snapshot(
    *,
    user_id: int,
    model_id: int,
    snapshot: Mapping[str, Any] | None,
    source: str,
    strict: bool = False,
    idempotency_key: str | None = None,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    usage_details = extract_usage_details_from_snapshot(snapshot)
    return await persist_model_usage(
        user_id=user_id,
        model_id=model_id,
        usage_details=usage_details,
        source=source,
        strict=strict,
        idempotency_key=idempotency_key,
        at=at,
        cycle_anchor_at=cycle_anchor_at,
    )


async def persist_model_usage_from_completion(
    *,
    user_id: int,
    model_id: int,
    completion: Any,
    source: str,
    strict: bool = False,
    idempotency_key: str | None = None,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    usage_details = extract_usage_details_from_completion(completion)
    return await persist_model_usage(
        user_id=user_id,
        model_id=model_id,
        usage_details=usage_details,
        source=source,
        strict=strict,
        idempotency_key=idempotency_key,
        at=at,
        cycle_anchor_at=cycle_anchor_at,
    )


async def persist_engine_usage(
    *,
    user_id: int,
    resource_uuid: str,
    usage_details: Mapping[str, Any] | None,
    source: str,
    strict: bool = False,
    idempotency_key: str | None = None,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    normalized = normalize_usage_details(usage_details)
    if not normalized:
        return 0

    key = idempotency_key or f"{source}:{uuid4().hex}"
    try:
        async with async_session_context() as db:
            billable_units = await _resolve_engine_billable_units(
                db=db,
                resource_uuid=resource_uuid,
                usage_details=normalized,
            )
            charged_points = await _resolve_engine_charge_points(
                db=db,
                resource_uuid=resource_uuid,
                billable_units=billable_units,
            )
            billable_points = await record_usage(
                db=db,
                user_id=user_id,
                resource_uuid=resource_uuid,
                resource_type="engine",
                usage_details=normalized,
                charged_points=charged_points,
                source=source,
                idempotency_key=key,
                at=at,
                cycle_anchor_at=cycle_anchor_at,
            )
            await _consume_charged_points(
                user_id=user_id,
                charged_points=charged_points,
                reason="Official engine usage",
                source="engine-usage",
                idempotency_key=f"compute:{key}",
            )
            await db.commit()
            return billable_points
    except Exception as e:
        exception_logger.error(
            format_log_message(
                "engine_usage_persist_failed",
                user_id=user_id,
                engine_uuid=resource_uuid,
                source=source,
                error=e,
            )
        )
        if strict:
            raise
        return 0


async def persist_engine_usage_from_completion(
    *,
    user_id: int,
    resource_uuid: str,
    completion: Any,
    source: str,
    strict: bool = False,
    idempotency_key: str | None = None,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    usage_details = extract_usage_details_from_completion(completion)
    if usage_details is None:
        return 0
    return await persist_engine_usage(
        user_id=user_id,
        resource_uuid=resource_uuid,
        usage_details=usage_details,
        source=source,
        strict=strict,
        idempotency_key=idempotency_key,
        at=at,
        cycle_anchor_at=cycle_anchor_at,
    )


def _merge_usage(left: Mapping[str, int], right: Mapping[str, int]) -> dict[str, int]:
    merged: dict[str, int] = dict(left)
    for key, value in right.items():
        merged[key] = merged.get(key, 0) + int(value)
    return merged


def _deserialize_usage(raw: str | None) -> dict[str, int]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except Exception:
        return {}
    if not isinstance(data, dict):
        return {}
    return normalize_usage_details(data)


def _serialize_usage(usage: Mapping[str, int]) -> str:
    return json.dumps(dict(usage), ensure_ascii=False, sort_keys=True)


async def record_usage(
    db: AsyncSession,
    *,
    user_id: int,
    resource_uuid: str,
    resource_type: str,
    usage_details: Mapping[str, Any],
    charged_points: int | None = None,
    source: str | None = None,
    idempotency_key: str | None = None,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    normalized = normalize_usage_details(usage_details)
    if not normalized:
        return 0

    billable_points = max(int(charged_points), 0) if charged_points is not None else calculate_billable_points(normalized)
    now = at or datetime.now(timezone.utc)
    cycle_month = get_cycle_month(now, cycle_anchor_at=cycle_anchor_at)

    if idempotency_key:
        existing = await crud.usage.get_usage_ledger_by_idempotency_key_async(
            db=db,
            idempotency_key=idempotency_key,
        )
        if existing is not None:
            return int(existing.billable_points)

    await crud.usage.create_usage_ledger_async(
        db=db,
        user_id=user_id,
        resource_uuid=resource_uuid,
        resource_type=resource_type,
        cycle_month=cycle_month,
        usage_json=_serialize_usage(normalized),
        billable_points=billable_points,
        source=source,
        idempotency_key=idempotency_key,
        create_time=now,
    )

    monthly = await crud.usage.get_monthly_usage_summary_async(
        db=db,
        user_id=user_id,
        resource_uuid=resource_uuid,
        cycle_month=cycle_month,
    )
    if monthly is None:
        await crud.usage.create_monthly_usage_summary_async(
            db=db,
            user_id=user_id,
            resource_uuid=resource_uuid,
            resource_type=resource_type,
            cycle_month=cycle_month,
            usage_json=_serialize_usage(normalized),
            used_points=billable_points,
            create_time=now,
        )
    else:
        current_usage = _deserialize_usage(monthly.usage_json)
        monthly.usage_json = _serialize_usage(_merge_usage(current_usage, normalized))
        monthly.used_points = int(monthly.used_points) + billable_points
        monthly.update_time = now

    await db.flush()
    return billable_points


async def record_model_usage(
    db: AsyncSession,
    *,
    user_id: int,
    model_id: int,
    usage_details: Mapping[str, Any],
    charged_points: int | None = None,
    source: str | None = None,
    idempotency_key: str | None = None,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    db_model = await crud.model.get_ai_model_by_id_async(db=db, model_id=model_id)
    if db_model is None:
        return 0
    return await record_usage(
        db=db,
        user_id=user_id,
        resource_uuid=db_model.uuid,
        resource_type="llm",
        usage_details=usage_details,
        charged_points=charged_points,
        source=source,
        idempotency_key=idempotency_key,
        at=at,
        cycle_anchor_at=cycle_anchor_at,
    )


def get_monthly_used_points(
    db: Session,
    *,
    user_id: int,
    resource_uuid: str,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    start_time, end_time = get_cycle_window(
        at,
        cycle_anchor_at=cycle_anchor_at,
    )
    return crud.usage.sum_usage_ledger_points_in_window(
        db=db,
        user_id=user_id,
        resource_uuid=resource_uuid,
        start_time=start_time,
        end_time=end_time,
    )


def get_monthly_model_used_points(
    db: Session,
    *,
    user_id: int,
    model_id: int,
    at: datetime | None = None,
    cycle_anchor_at: datetime | None = None,
) -> int:
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    if db_model is None:
        return 0
    return get_monthly_used_points(
        db=db,
        user_id=user_id,
        resource_uuid=db_model.uuid,
        at=at,
        cycle_anchor_at=cycle_anchor_at,
    )


async def _resolve_model_charge_points(
    *,
    db: AsyncSession,
    model_id: int,
    raw_points: int,
) -> int:
    if raw_points <= 0:
        return 0
    db_model = await crud.model.get_ai_model_by_id_async(db=db, model_id=model_id)
    if db_model is None or not bool(db_model.is_official_hosted):
        return 0
    return _apply_billing_policy(
        base_units=raw_points,
        unit_price=1.0,
        multiplier=db_model.compute_point_multiplier,
    )


async def _resolve_engine_billable_units(
    *,
    db: AsyncSession,
    resource_uuid: str,
    usage_details: Mapping[str, int],
) -> int:
    db_engine = await crud.engine.get_engine_by_uuid_async(db=db, engine_uuid=resource_uuid)
    if db_engine is None:
        return 0
    return calculate_engine_billable_units(
        usage_details=usage_details,
        billing_mode=db_engine.billing_mode,
    )


async def _resolve_engine_charge_points(
    *,
    db: AsyncSession,
    resource_uuid: str,
    billable_units: int,
) -> int:
    if billable_units <= 0:
        return 0
    db_engine = await crud.engine.get_engine_by_uuid_async(db=db, engine_uuid=resource_uuid)
    if db_engine is None or not bool(db_engine.is_official_hosted):
        return 0
    return _apply_billing_policy(
        base_units=billable_units,
        unit_price=db_engine.billing_unit_price,
        multiplier=db_engine.compute_point_multiplier,
    )


async def _consume_charged_points(
    *,
    user_id: int,
    charged_points: int,
    reason: str,
    source: str,
    idempotency_key: str,
) -> None:
    if charged_points <= 0:
        return
    authorization = await _build_authorization(user_id)
    if authorization is None:
        raise RuntimeError("Failed to build authorization for compute point consumption")
    await _consume_points(
        authorization=authorization,
        billable_points=charged_points,
        reason=reason,
        source=source,
        idempotency_key=idempotency_key,
    )


def _apply_billing_policy(
    *,
    base_units: int,
    unit_price: float | None,
    multiplier: float | None,
) -> int:
    points = max(int(base_units), 0)
    if points <= 0:
        return 0
    effective_unit_price = float(unit_price or 1.0)
    effective_multiplier = float(multiplier or 1.0)
    effective_rate = effective_unit_price * effective_multiplier
    if effective_rate <= 1:
        return points
    return max(int(round(points * effective_rate)), 1)


def get_minimum_required_points(
    *,
    multiplier: float | None,
    unit_price: float | None = None,
) -> int:
    effective_rate = float(unit_price or 1.0) * float(multiplier or 1.0)
    if effective_rate <= 1:
        return 1
    return max(int(round(effective_rate)), 1)


async def _consume_points(
    *,
    authorization: str,
    billable_points: int,
    reason: str,
    source: str,
    idempotency_key: str,
) -> None:
    if billable_points <= 0:
        return
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.post(
                f"{UNION_PAY_API_PREFIX}/user/compute/consume",
                headers={"Authorization": authorization},
                json={
                    "points": int(billable_points),
                    "reason": reason,
                    "source": source,
                    "idempotency_key": idempotency_key,
                },
            )
            if not response.is_success:
                raise RuntimeError(
                    format_log_message(
                        "compute_consume_rejected",
                        idempotency_key=idempotency_key,
                        status_code=response.status_code,
                        response_text=response.text[:500],
                    )
                )
    except Exception as e:
        raise RuntimeError(
            format_log_message(
                "compute_consume_failed",
                idempotency_key=idempotency_key,
                error=e,
            )
        ) from e


async def _build_authorization(user_id: int) -> str | None:
    async with async_session_context() as db:
        db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
        if db_user is None:
            return None
        access_token, _ = create_token(user=db_user)
        return f"Bearer {access_token}"
