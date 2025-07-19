import schemas
import crud
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from common.dependencies import get_current_user, get_db
from aliyunsdkcore.client import AcsClient
from aliyunsdksts.request.v20150401.AssumeRoleRequest import AssumeRoleRequest

file_system_router = APIRouter()

@file_system_router.post('/oss/sts', response_model=schemas.file_system.OssStsResponse)
async def get_oss_sts(db: Session = Depends(get_db),
                      current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                              user_id=current_user.id,
                                                                                              file_system_id=2)
    if db_user_file_system is None:
        raise Exception("User file system not found")
    
    config_str = db_user_file_system.config_json
    
    if config_str is None:
        raise Exception("User file system config is empty")
    
    config = json.loads(config_str)
    role_arn = config.get('role_arn')
    role_session_name = config.get('role_session_name')
    user_access_key_id = config.get('user_access_key_id')
    user_access_key_secret = config.get('user_access_key_secret')
    region_id = config.get('region_id')
    
    client = AcsClient(user_access_key_id, user_access_key_secret, region_id)
    request = AssumeRoleRequest()
    request.set_accept_format('json')
    request.set_RoleArn(role_arn)
    request.set_RoleSessionName(role_session_name)

    response = client.do_action_with_exception(request)
    result = json.loads(response)
    sts_role_session_token = result.get('Credentials').get('SecurityToken')
    sts_role_access_key_id = result.get('Credentials').get('AccessKeyId')
    sts_role_access_key_secret = result.get('Credentials').get('AccessKeySecret')
    return schemas.file_system.OssStsResponse(access_key_id=sts_role_access_key_id,
                                              access_key_secret=sts_role_access_key_secret,
                                              security_token=sts_role_session_token)

@file_system_router.post('/detail', response_model=schemas.file_system.UserFileSystemInfo)
async def get_file_system_info(file_system_info_request: schemas.file_system.FileSystemInfoRequest,
                               db: Session = Depends(get_db),
                               current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_file_system = crud.file_system.get_file_system_by_id(db=db, file_system_id=file_system_info_request.file_system_id)
    db_user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                              user_id=current_user.id,
                                                                                              file_system_id=file_system_info_request.file_system_id)
    if db_file_system is None:
        raise Exception(status_code=404, detail="File System not found")
    if db_user_file_system is None:
        raise Exception(status_code=404, detail="User File System not found")
    res = schemas.file_system.UserFileSystemInfo(id=db_file_system.id,
                                                 name=db_file_system.name,
                                                 name_zh=db_file_system.name_zh,
                                                 description=db_file_system.description,
                                                 description_zh=db_file_system.description_zh,
                                                 demo_config=db_file_system.demo_config,
                                                 config_json=db_user_file_system.config_json,
                                                 create_time=db_user_file_system.create_time,
                                                 update_time=db_user_file_system.update_time)
    return res

@file_system_router.post("/mine", response_model=schemas.file_system.MineFileSystemSearchResponse)
async def search_mine_file_system(file_system_search_request: schemas.file_system.FileSystemSearchRequest, 
                                  db: Session = Depends(get_db), 
                                  current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    file_systems = crud.file_system.get_file_system_by_user_id(db=db,
                                                               user_id=current_user.id,
                                                                    keyword=file_system_search_request.keyword)
    for file_system in file_systems:
        db_user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                                  user_id=current_user.id,
                                                                                                  file_system_id=file_system.id)
        if db_user_file_system is not None:
            file_system.config_json = db_user_file_system.config_json
    return schemas.file_system.MineFileSystemSearchResponse(data=file_systems)

@file_system_router.post("/provide", response_model=schemas.file_system.ProvideFileSystemSearchResponse)
async def provide_file_system(file_system_search_request: schemas.file_system.FileSystemSearchRequest, 
                                        db: Session = Depends(get_db), 
                                        current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    file_systems = crud.file_system.get_all_file_systems(db=db, keyword=file_system_search_request.keyword)
    return schemas.file_system.ProvideFileSystemSearchResponse(data=file_systems)

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
            # if the user's default file system is the same as the file system to be uninstalled, set the default file system to None
            if current_user.default_file_system == file_system_install_request.file_system_id:
                current_user.default_file_system = None
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