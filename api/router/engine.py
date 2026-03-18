from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    get_current_user,
    get_db,
    get_user_plan_level_in_func,
)
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

engine_router = APIRouter()
SUBSCRIPTION_GATE_ENABLED = check_deployed_by_official_in_fuc()


def _is_privileged_user(user: models.user.User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.ROOT)


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

@engine_router.post("/create", response_model=schemas.common.NormalResponse)
def create_engine(
    engine_create_request: schemas.engine.EngineCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    """创建引擎"""
    required_plan_level = int(
        normalize_plan_access_level(engine_create_request.required_plan_level)
    )
    db_engine = crud.engine.create_engine(
        db=db,
        name=engine_create_request.name,
        description=engine_create_request.description,
        is_public=engine_create_request.is_public,
        required_plan_level=required_plan_level,
        config_json=engine_create_request.config_json,
        creator_id=user.id,
        engine_provided_id=engine_create_request.engine_provided_id
    )
    crud.engine.create_user_engine(
        db=db,
        user_id=user.id,
        engine_id=db_engine.id,
        role=UserEngineRole.CREATOR
    )
    db.commit()
    return schemas.common.SuccessResponse()

@engine_router.post("/community", response_model=schemas.pagination.InifiniteScrollPagnition[schemas.engine.EngineInfo])
def search_document_parse_engine(
    engine_search_request: schemas.engine.CommunityEngineSearchRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    """搜索当前所有我可以使用的引擎 包含我创建的和公开的
    """
    has_more = True
    next_start = None
    next_model_provider = None
    db_engines = crud.engine.search_engines_for_user(
        db=db,
        user_id=user.id,
        keyword=engine_search_request.keyword,
    )
    if len(db_engines) < engine_search_request.limit or len(db_engines) == 0:
        has_more = False
    if len(db_engines) == engine_search_request.limit:
        next_model_provider = crud.engine.search_next_engine_for_user(
            db=db,
            user_id=user.id,
            engine=db_engines[-1][0],
            keyword=engine_search_request.keyword
        )
        has_more = next_model_provider is not None
        next_start = next_model_provider.id if next_model_provider is not None else None
    total = crud.engine.count_all_engines_for_user(
        db=db,
        user_id=user.id,
        keyword=engine_search_request.keyword
    )
    next_start = next_model_provider.id if next_model_provider is not None else None
    data = [
        _serialize_engine_info(
            item[0],
            is_forked=crud.engine.get_user_engine_by_user_id_and_engine_id(
                db=db,
                user_id=user.id,
                engine_id=item[0].id,
                filter_role=UserEngineRole.FORKER
            ) is not None,
        )
        for item in db_engines
    ]
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=engine_search_request.start,
        limit=engine_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@engine_router.post("/usable", response_model=schemas.engine.UsableEnginesResponse)
def search_usable_engine(
    engine_search_request: schemas.engine.UsableEngineSearchRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    """搜索当前所有我配置好的引擎 我自己的和我fork的
    """
    data = []
    db_engines = crud.engine.get_usable_engines_for_user(
        db=db,
        user_id=user.id,
        keyword=engine_search_request.keyword,
        filter_category=engine_search_request.filter_category
    )
    for db_engine in db_engines:
        if not db_engine.is_public and db_engine.creator_id != user.id:
            continue
        db_engine_provided = crud.engine.get_engine_provided_by_engine_id(
            db=db,
            engine_id=db_engine.id
        )
        if db_engine_provided is None:
            continue
        data.append(
            _serialize_engine_info(
                db_engine,
                is_forked=crud.engine.get_user_engine_by_user_id_and_engine_id(
                    db=db,
                    user_id=user.id,
                    engine_id=db_engine.id,
                    filter_role=UserEngineRole.FORKER,
                ) is not None,
            )
        )
    return schemas.engine.UsableEnginesResponse(data=data)

@engine_router.post('/detail', response_model=schemas.engine.EngineDetail)
def get_engine_detail(
    engine_detail_request: schemas.engine.EngineDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_engine = crud.engine.get_engine_by_engine_id(
        db=db,
        engine_id=engine_detail_request.engine_id
    )
    if db_engine is None:
        raise schemas.error.CustomException(code=404, message="Engine not found")
    db_engine_provided = crud.engine.get_engine_provided_by_engine_id(
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

@engine_router.post("/provided", response_model=schemas.engine.EngineProvidedSearchResponse)
def provide_document_parse_engine(
    engine_search_request: schemas.engine.EngineProvidedSearchRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_engines_provided = crud.engine.get_all_engines_provided(
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
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    db_engine = crud.engine.get_engine_by_engine_id(
        db=db,
        engine_id=engine_fork_request.engine_id,
    )
    if db_engine is None:
        raise schemas.error.CustomException(code=404, message="Engine not found")
    if db_engine.creator_id == current_user.id:
        raise schemas.error.CustomException(code=403, message="You can't fork your own engine")
    if not db_engine.is_public:
        raise schemas.error.CustomException(code=403, message="You can't fork a private engine")
    db_user_engine = crud.engine.get_user_engine_by_user_id_and_engine_id(
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
            db.commit()
            return schemas.common.SuccessResponse()
    else:
        if engine_fork_request.status:
            await _ensure_subscription_access(
                user=current_user,
                required_plan_level=db_engine.required_plan_level,
            )
            crud.engine.create_user_engine(
                db=db,
                user_id=current_user.id,
                engine_id=engine_fork_request.engine_id,
                role=UserEngineRole.FORKER,
            )
        else:
            raise schemas.error.CustomException(code=403, message="You have not forked this engine")

    db.commit()

    return schemas.common.SuccessResponse()

@engine_router.post("/delete", response_model=schemas.common.NormalResponse)
def delete_engine(
    engine_delete_request: schemas.engine.EngineDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    
    db_engine = crud.engine.get_engine_by_engine_id(
        db=db,
        engine_id=engine_delete_request.engine_id
    )
    if db_engine is None:
        raise schemas.error.CustomException(code=404, message="Engine not found")
    if db_engine.creator_id != user.id:
        raise schemas.error.CustomException(code=403, message="Permission denied")
    
    db_engine.delete_at = now
    
    db_user_engine = crud.engine.get_user_engine_by_user_id_and_engine_id(
        db=db,
        user_id=user.id,
        engine_id=engine_delete_request.engine_id,
        filter_role=UserEngineRole.CREATOR
    )
    if db_user_engine is None:
        raise schemas.error.CustomException(code=403, message="Permission denied")

    db_user_engine.delete_at = now
    
    db.commit()
    return schemas.common.SuccessResponse()

@engine_router.post("/update", response_model=schemas.common.NormalResponse)
def update_engine(
    engine_update_request: schemas.engine.EngineUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    
    db_engine = crud.engine.get_engine_by_engine_id(
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

    db_engine.update_time = now

    db.commit()
    return schemas.common.SuccessResponse()
