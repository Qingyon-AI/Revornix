import schemas
import crud
import json
import os
import boto3
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from botocore.config import Config
from common.dependencies import get_current_user, get_db
from aliyunsdkcore.client import AcsClient
from aliyunsdksts.request.v20150401.AssumeRoleRequest import AssumeRoleRequest

file_system_router = APIRouter()

@file_system_router.post('/url-prefix', response_model=schemas.file_system.FileUrlPrefixResponse)
async def get_url_prefix(file_url_prefix_request: schemas.file_system.FileUrlPrefixRequest,
                         db: Session = Depends(get_db)):
    db_user = crud.user.get_user_by_id(db=db, user_id=file_url_prefix_request.user_id)
    res = None
    if db_user is None:
        raise Exception('User not found')
    db_user_file_system = crud.file_system.get_user_file_system_by_id(db=db,
                                                                      user_file_system_id=db_user.default_user_file_system)
    if db_user_file_system is None:
            raise Exception('User file system not found')
    db_file_system = crud.file_system.get_file_system_by_id(db=db, 
                                                            file_system_id=db_user_file_system.file_system_id)
    if db_file_system.id == 1:
        res = schemas.file_system.FileUrlPrefixResponse(url_prefix=f'{os.environ.get("FILE_SERVER_URL")}/{db_user.uuid}')
    elif db_file_system.id == 2:
        config_str = db_user_file_system.config_json
        if config_str is None:
            raise Exception("User file system config is empty")
        config = json.loads(config_str)
        res = schemas.file_system.FileUrlPrefixResponse(url_prefix=f'{config.get("url_prefix")}')
    return res

@file_system_router.post('/built-in/sts', response_model=schemas.file_system.BuiltInStsResponse)
async def get_built_in_sts(db: Session = Depends(get_db),
                           current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    sts = boto3.client(
        'sts',
        endpoint_url=os.environ.get('FILE_SERVER_URL'),
        aws_access_key_id='minioadmin',
        aws_secret_access_key='minioadmin',
        config=Config(signature_version='s3v4'),
        region_name="main" 
    )
    resp = sts.assume_role(
        RoleArn='arn:minio:iam::minio:role/upload-policy',
        RoleSessionName='upload-session',
        DurationSeconds=3600
    )
    sts_role_session_token = resp.get('Credentials').get('SessionToken')
    sts_role_access_key_id = resp.get('Credentials').get('AccessKeyId')
    sts_role_access_key_secret = resp.get('Credentials').get('SecretAccessKey')
    expiration = resp.get('Credentials').get('Expiration').isoformat()
    return schemas.file_system.BuiltInStsResponse(access_key_id=sts_role_access_key_id,
                                                  access_key_secret=sts_role_access_key_secret,
                                                  security_token=sts_role_session_token,
                                                  endpoint_url=os.environ.get('FILE_SERVER_URL'),
                                                  expiration=expiration,
                                                  region="main")

@file_system_router.post('/oss/sts', response_model=schemas.file_system.OssStsResponse)
async def get_oss_sts(db: Session = Depends(get_db),
                      current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_user_file_system = crud.file_system.get_user_file_system_by_id(db=db,
                                                                      user_file_system_id=current_user.default_user_file_system)
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
    expiration = result.get('Credentials').get('Expiration')
    endpoint_url = config.get('oss_endpoint')
    return schemas.file_system.OssStsResponse(access_key_id=sts_role_access_key_id,
                                              access_key_secret=sts_role_access_key_secret,
                                              security_token=sts_role_session_token,
                                              endpoint_url=endpoint_url,
                                              expiration=expiration,
                                              region=region_id)

@file_system_router.post('/detail', response_model=schemas.file_system.FileSystemInfo)
async def get_file_system_info(file_system_info_request: schemas.file_system.FileSystemInfoRequest,
                               db: Session = Depends(get_db),
                               current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_file_system = crud.file_system.get_file_system_by_id(db=db, 
                                                            file_system_id=file_system_info_request.file_system_id)
    if db_file_system is None:
        raise Exception(status_code=404, detail="File System not found")
    return schemas.file_system.FileSystemInfo.model_validate(db_file_system)

@file_system_router.post('/user-file-system/detail', response_model=schemas.file_system.UserFileSystemInfo)
async def get_file_system_info(user_file_system_info_request: schemas.file_system.UserFileSystemInfoRequest,
                               db: Session = Depends(get_db),
                               current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_user_file_system = crud.file_system.get_user_file_system_by_id(db=db, 
                                                                      user_file_system_id=user_file_system_info_request.user_file_system_id)
    if db_user_file_system is None:
        raise Exception(status_code=404, detail="User File System not found")
    if db_user_file_system.user_id != current_user.id:
        raise Exception(status_code=403, detail="You don't have permission to access this user file system info")
    db_file_system = crud.file_system.get_file_system_by_id(db=db, 
                                                            file_system_id=db_user_file_system.file_system_id)
    if db_file_system is None:
        raise Exception(status_code=404, detail="File System not found")
    res = schemas.file_system.UserFileSystemInfo(id=db_user_file_system.id,
                                                 title=db_user_file_system.name,
                                                 description=db_user_file_system.description,
                                                 demo_config=db_file_system.demo_config,
                                                 config_json=db_user_file_system.config_json,
                                                 create_time=db_user_file_system.create_time,
                                                 update_time=db_user_file_system.update_time)
    return res

@file_system_router.post("/mine", response_model=schemas.file_system.MineFileSystemSearchResponse)
async def search_mine_file_system(file_system_search_request: schemas.file_system.FileSystemSearchRequest, 
                                  db: Session = Depends(get_db), 
                                  current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    res = []
    db_user_file_systems = crud.file_system.get_user_file_systems_by_user_id(db=db,
                                                                             user_id=current_user.id,
                                                                             keyword=file_system_search_request.keyword)
    for db_user_file_system in db_user_file_systems:
        db_file_system = crud.file_system.get_file_system_by_id(db=db, 
                                                                file_system_id=db_user_file_system.file_system_id)
        item = schemas.file_system.UserFileSystemInfo(
            id=db_user_file_system.id,
            title=db_user_file_system.title,
            description=db_user_file_system.description,
            config_json=db_user_file_system.config_json,
            create_time=db_user_file_system.create_time,
            update_time=db_user_file_system.update_time,
            demo_config=db_file_system.demo_config
        )
        res.append(item)
    return schemas.file_system.MineFileSystemSearchResponse(data=res)

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
    crud.file_system.bind_file_system_to_user(db=db,
                                              user_id=current_user.id,
                                              file_system_id=file_system_install_request.file_system_id)
    db.commit()
    return schemas.common.SuccessResponse()

@file_system_router.post("/update", response_model=schemas.common.NormalResponse)
async def update_file_system(user_file_system_update_request: schemas.file_system.UserFileSystemUpdateRequest, 
                             db: Session = Depends(get_db),
                             current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    now = datetime.now(tz=timezone.utc)
    user_file_system = crud.file_system.get_user_file_system_by_id(db=db,
                                                                   user_file_system_id=user_file_system_update_request.user_file_system_id)
    if user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    else:
        if user_file_system_update_request.title is not None:
            user_file_system.title = user_file_system_update_request.title
        if user_file_system_update_request.description is not None:
            user_file_system.description = user_file_system_update_request.description
        if user_file_system_update_request.config_json is not None:
            user_file_system.config_json = user_file_system_update_request.config_json
        user_file_system.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()