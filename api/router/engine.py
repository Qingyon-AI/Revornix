import schemas
import crud
import models
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import timezone, datetime
from typing import cast
from common.dependencies import get_current_user, get_db

engine_router = APIRouter()

@engine_router.post("/mine", response_model=schemas.engine.MineEngineSearchResponse)
async def search_document_parse_engine(engine_search_request: schemas.engine.EngineSearchRequest, 
                                       db: Session = Depends(get_db), 
                                       current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    res = []
    db_user_engines = crud.engine.get_user_engine_by_user_id(db=db,
                                                             user_id=current_user.id,
                                                             keyword=engine_search_request.keyword)
    typed_user_engines = cast(
        list[tuple[models.engine.UserEngine, models.engine.Engine]], 
        db_user_engines
    )
    for db_user_engine, db_engine in typed_user_engines:
        item = schemas.engine.UserEngineInfo(
            id=db_user_engine.id,
            category=db_engine.category,
            engine_id=db_user_engine.engine_id,
            title=db_user_engine.title,
            description=db_user_engine.description,
            demo_config=db_engine.demo_config,
            enable=db_user_engine.enable,
            config_json=db_user_engine.config_json,
            create_time=db_user_engine.create_time,
            update_time=db_user_engine.update_time
        )
        res.append(item)
    return schemas.engine.MineEngineSearchResponse(data=res)

@engine_router.post("/provide", response_model=schemas.engine.ProvideEngineSearchResponse)
async def provide_document_parse_engine(engine_search_request: schemas.engine.EngineSearchRequest, 
                                        db: Session = Depends(get_db), 
                                        current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    engines = crud.engine.get_all_engines(db=db, keyword=engine_search_request.keyword)
    return schemas.engine.ProvideEngineSearchResponse(data=engines)

@engine_router.post("/install", response_model=schemas.engine.EngineInstallResponse)
async def install_engine(engine_install_request: schemas.engine.EngineInstallRequest, 
                         db: Session = Depends(get_db), 
                         current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_user_engine = crud.engine.create_user_engine(db=db,
                                                    user_id=current_user.id,
                                                    engine_id=engine_install_request.engine_id,
                                                    title=engine_install_request.title,
                                                    description=engine_install_request.description,
                                                    config_json=engine_install_request.config_json)
    db.commit()
    return schemas.engine.EngineInstallResponse(user_engine_id=db_user_engine.id)

@engine_router.post("/delete", response_model=schemas.common.NormalResponse)
async def delete_engine(engine_delete_request: schemas.engine.EngineDeleteRequest, 
                        db: Session = Depends(get_db),
                        current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.engine.delete_user_engine_by_user_id_and_user_engine_id(db=db,
                                                                 user_id=current_user.id,
                                                                 user_engine_id=engine_delete_request.user_engine_id)
    db.commit()
    return schemas.common.SuccessResponse()

@engine_router.post("/update", response_model=schemas.common.NormalResponse)
async def update_engine(engine_update_request: schemas.engine.EngineUpdateRequest, 
                        db: Session = Depends(get_db),
                        current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    now = datetime.now(tz=timezone.utc)
    user_engine = crud.engine.get_user_engine_by_user_engine_id(db=db,
                                                                user_engine_id=engine_update_request.user_engine_id)
    if user_engine is None:
        raise schemas.error.CustomException(code=404, message="User Engine not found")
    else:
        if engine_update_request.title is not None:
            user_engine.title = engine_update_request.title
        if engine_update_request.description is not None:
            user_engine.description = engine_update_request.description
        if engine_update_request.config_json is not None:
            user_engine.config_json = engine_update_request.config_json
        user_engine.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()