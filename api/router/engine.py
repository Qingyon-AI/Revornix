import schemas
import crud
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import timezone, datetime
from common.dependencies import get_current_user, get_db

engine_router = APIRouter()

@engine_router.post("/mine", response_model=schemas.engine.MineEngineSearchResponse)
async def search_document_parse_engine(engine_search_request: schemas.engine.EngineSearchRequest, 
                                       db: Session = Depends(get_db), 
                                       current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    engines = crud.engine.get_engine_by_user_id(db=db,
                                                user_id=current_user.id,
                                                keyword=engine_search_request.keyword)
    for engine in engines:
        db_user_engine = crud.engine.get_user_engine_by_user_id_and_engine_id(db=db,
                                                                              user_id=current_user.id,
                                                                              engine_id=engine.id)
        engine.enable = db_user_engine.enable
        engine.config_json = db_user_engine.config_json
    return schemas.engine.MineEngineSearchResponse(data=engines)

@engine_router.post("/provide", response_model=schemas.engine.ProvideEngineSearchResponse)
async def provide_document_parse_engine(engine_search_request: schemas.engine.EngineSearchRequest, 
                                        db: Session = Depends(get_db), 
                                        current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    engines = crud.engine.get_all_engines(db=db, keyword=engine_search_request.keyword)
    return schemas.engine.ProvideEngineSearchResponse(data=engines)

@engine_router.post("/install", response_model=schemas.common.NormalResponse)
async def install_engine(engine_install_request: schemas.engine.EngineInstallRequest, 
                         db: Session = Depends(get_db), 
                         current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    user_engine = crud.engine.get_user_engine_by_user_id_and_engine_id(db=db,
                                                                       user_id=current_user.id,
                                                                       engine_id=engine_install_request.engine_id)
    if user_engine is None:
        if engine_install_request.status:
            crud.engine.create_user_engine(db=db,
                                        user_id=current_user.id,
                                        engine_id=engine_install_request.engine_id)
        else:
            raise schemas.error.CustomException(code=400, message="Operation failed")
    else:
        if engine_install_request.status:
            raise schemas.error.CustomException(code=400, message="Operation failed")
        else:
            user_engine.delete_at = datetime.now(tz=timezone.utc)
        now = datetime.now(tz=timezone.utc)
        user_engine.delete_at = now
    db.commit()
    return schemas.common.SuccessResponse()

@engine_router.post("/update", response_model=schemas.common.NormalResponse)
async def enable_engine(engine_update_request: schemas.engine.EngineUpdateRequest, 
                        db: Session = Depends(get_db),
                        current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    now = datetime.now(tz=timezone.utc)
    user_engine = crud.engine.get_user_engine_by_user_id_and_engine_id(db=db,
                                                                       user_id=current_user.id,
                                                                       engine_id=engine_update_request.engine_id)
    if user_engine is None:
        raise schemas.error.CustomException(code=404, message="User Engine not found")
    else:
        user_engine.config_json = engine_update_request.config_json
        user_engine.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()