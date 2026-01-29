from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db
from enums.engine_enums import UserEngineRole
from common.encrypt import decrypt_engine_config, encrypt_engine_config

engine_router = APIRouter()

@engine_router.post("/create", response_model=schemas.common.NormalResponse)
def create_engine(
    engine_create_request: schemas.engine.EngineCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    """创建引擎"""
    db_engine = crud.engine.create_engine(
        db=db,
        name=engine_create_request.name,
        description=engine_create_request.description,
        is_public=engine_create_request.is_public,
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

    def get_engine_info(db_engine: models.engine.Engine):
        db_engine_provided = crud.engine.get_engine_provided_by_engine_id(
            db=db,
            engine_id=db_engine.id
        )
        if db_engine_provided is None:
            return None
        res = schemas.engine.EngineBaseInfo.model_validate(db_engine)
        return schemas.engine.EngineInfo.model_validate(
            {
                **res.model_dump(),
                "category": db_engine_provided.category,
                "is_forked": crud.engine.get_user_engine_by_user_id_and_engine_id(
                    db=db,
                    user_id=user.id,
                    engine_id=db_engine.id,
                    filter_role=UserEngineRole.FORKER
                ) is not None
            }
        )
        
    data = [
        get_engine_info(item[0])
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
    db_engines = crud.engine.get_engines_for_user(
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
        base = schemas.engine.EngineBaseInfo.model_validate(db_engine)
        data.append(schemas.engine.EngineInfo.model_validate(
            {
                **base.model_dump(),
                "category": db_engine_provided.category,
            }
        ))
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
            base = schemas.engine.EngineBaseInfo.model_validate(db_engine, from_attributes=True)
            return schemas.engine.EngineInfo.model_validate(
                {
                    **base.model_dump(),
                    "category": db_engine_provided.category,
                    "is_forked": crud.engine.get_user_engine_by_user_id_and_engine_id(
                        db=db,
                        user_id=user.id,
                        engine_id=engine_detail_request.engine_id,
                        filter_role=UserEngineRole.FORKER
                    ) is not None,
                }
            )
    else:
        base = schemas.engine.EngineBaseInfo.model_validate(db_engine)
        res = schemas.engine.EngineDetail.model_validate(
            {
                **base.model_dump(),
                "category": db_engine_provided.category,
            }
        )
        if db_engine.config_json is not None:
            res.config_json = decrypt_engine_config(db_engine.config_json)
        return res

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
def install_engine(
    engine_fork_request: schemas.engine.EngineForkRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    
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

    db_engine.update_time = now

    db.commit()
    return schemas.common.SuccessResponse()
