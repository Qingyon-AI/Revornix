import schemas
import crud
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import timezone, datetime
from common.dependencies import get_current_user, get_db

file_system_router = APIRouter()

@file_system_router.post("/mine", response_model=schemas.file_system.MineFileSystemSearchResponse)
async def search_mine_file_system(engine_search_request: schemas.engine.FileSystemSearchRequest, 
                                  db: Session = Depends(get_db), 
                                  current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    file_systems = crud.file_system.get_user_file_system_by_user_id(db=db,
                                                                    user_id=current_user.id,
                                                                    keyword=engine_search_request.keyword)
    for file_system in file_systems:
        db_user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                                  user_id=current_user.id,
                                                                                                  file_system_id=file_system.id)
        file_system.config_json = db_user_file_system.config_json
    return schemas.file_system.MineEngineSearchResponse(data=file_systems)

@file_system_router.post("/provide", response_model=schemas.file_system.ProvideFileSystemSearchResponse)
async def provide_file_system(file_system_search_request: schemas.file_system.FileSystemSearchRequest, 
                                        db: Session = Depends(get_db), 
                                        current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    file_systems = crud.file_system.get_all_file_systems(db=db, keyword=file_system_search_request.keyword)
    return schemas.engine.ProvideEngineSearchResponse(data=file_systems)

@file_system_router.post("/install", response_model=schemas.common.NormalResponse)
async def install_file_system(file_system_install_request: schemas.file_system.FileSystemInstallRequest, 
                              db: Session = Depends(get_db), 
                              current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                           user_id=current_user.id,
                                                                                           file_system_id=file_system_install_request.file_system_id)
    if user_file_system is None:
        if file_system_install_request.status:
            crud.file_system.bind_file_system_to_user(db=db,
                                                      user_id=current_user.id,
                                                      file_system_id=file_system_install_request.file_system_id)
        else:
            raise schemas.error.CustomException(code=400, message="Operation failed")
    else:
        if file_system_install_request.status:
            raise schemas.error.CustomException(code=400, message="Operation failed")
        else:
            user_file_system.delete_at = datetime.now(tz=timezone.utc)
        now = datetime.now(tz=timezone.utc)
        user_file_system.delete_at = now
    db.commit()
    return schemas.common.SuccessResponse()

@file_system_router.post("/update", response_model=schemas.common.NormalResponse)
async def update_file_system(file_system_update_request: schemas.file_system.FileSystemUpdateRequest, 
                        db: Session = Depends(get_db),
                        current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    now = datetime.now(tz=timezone.utc)
    user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                           user_id=current_user.id,
                                                                                           file_system_id=file_system_update_request.file_system_id)
    if user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    else:
        user_file_system.config_json = file_system_update_request.config_json
        user_file_system.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()