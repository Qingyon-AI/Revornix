import schemas
import crud
import json
import boto3
import models
from typing import cast
import alibabacloud_oss_v2 as oss
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from botocore.config import Config
from common.dependencies import get_current_user, get_db
from aliyunsdkcore.client import AcsClient
from aliyunsdksts.request.v20150401.AssumeRoleRequest import AssumeRoleRequest
from enums.file import RemoteFileServiceUUID
from config.file_system import FILE_SYSTEM_USER_NAME, FILE_SYSTEM_PASSWORD, FILE_SYSTEM_SERVER_PRIVATE_URL, FILE_SYSTEM_SERVER_PUBLIC_URL
from protocol.remote_file_service import RemoteFileServiceProtocol
from file.generic_s3_remote_file_service import GenericS3RemoteFileService
from common.common import get_user_remote_file_system

file_system_router = APIRouter()

@file_system_router.post('/url-prefix', response_model=schemas.file_system.FileUrlPrefixResponse)
async def get_url_prefix(file_url_prefix_request: schemas.file_system.FileUrlPrefixRequest,
                         db: Session = Depends(get_db)):
    url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=file_url_prefix_request.user_id)
    res = schemas.file_system.FileUrlPrefixResponse(url_prefix=url_prefix)
    return res

@file_system_router.post("/built-in/presign-upload-url", response_model=schemas.file_system.S3PresignUploadURLResponse)
def get_built_in_presigned_url(s3_presign_upload_url_request: schemas.file_system.S3PresignUploadURLRequest,
                               db: Session = Depends(get_db),
                               current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    sts = boto3.client(
        'sts',
        endpoint_url=FILE_SYSTEM_SERVER_PRIVATE_URL,
        aws_access_key_id=FILE_SYSTEM_USER_NAME,
        aws_secret_access_key=FILE_SYSTEM_PASSWORD,
        config=Config(signature_version='s3v4'),
        region_name="main" 
    )
    resp = sts.assume_role(
        RoleArn='arn:aws:iam::minio:role/upload-policy',
        RoleSessionName='upload-session',
        DurationSeconds=3600
    )
    creds = resp['Credentials']
    s3 = boto3.client(
        's3',
        endpoint_url=FILE_SYSTEM_SERVER_PRIVATE_URL,
        aws_access_key_id=creds['AccessKeyId'],
        aws_secret_access_key=creds['SecretAccessKey'],
        aws_session_token=creds['SessionToken'],
        config=Config(signature_version='s3v4'),
        verify=False
    )
    expires_in = 3600
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(seconds=expires_in)
    response = s3.generate_presigned_post(
        Bucket=current_user.uuid,
        Key=s3_presign_upload_url_request.file_path,
        Fields={
            "Content-Type": s3_presign_upload_url_request.content_type
        },
        Conditions=[
            {"Content-Type": s3_presign_upload_url_request.content_type},
            {"bucket": current_user.uuid},
            ["eq", "$key", s3_presign_upload_url_request.file_path]
        ],
        ExpiresIn=expires_in,
    )
    return schemas.file_system.S3PresignUploadURLResponse(
        upload_url=response.get('url').replace(FILE_SYSTEM_SERVER_PRIVATE_URL, FILE_SYSTEM_SERVER_PUBLIC_URL),
        file_path=s3_presign_upload_url_request.file_path,
        fields=response.get('fields'),
        expiration=expiration
    )

@file_system_router.post("/aws-s3/presign-upload-url", response_model=schemas.file_system.S3PresignUploadURLResponse)
def get_aws_s3_presigned_url(s3_presign_upload_url_request: schemas.file_system.S3PresignUploadURLRequest,
                             db: Session = Depends(get_db),
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
    user_access_key_id = config.get('user_access_key_id')
    user_access_key_secret = config.get('user_access_key_secret')
    region_name = config.get('region_name')
    bucket = config.get('bucket')
    
    sts = boto3.client(
        'sts',
        aws_access_key_id=user_access_key_id,
        aws_secret_access_key=user_access_key_secret,
        config=Config(signature_version='s3v4'),
        region_name=region_name
    )
    resp = sts.assume_role(
        RoleArn=role_arn,
        RoleSessionName='s3-session',
        DurationSeconds=3600
    )
    creds = resp['Credentials']
    s3 = boto3.client(
        's3',
        aws_access_key_id=creds['AccessKeyId'],
        aws_secret_access_key=creds['SecretAccessKey'],
        aws_session_token=creds['SessionToken'],
        config=Config(signature_version='s3v4')
    )
    expires_in = 3600
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(seconds=expires_in)
    response = s3.generate_presigned_post(
        Bucket=bucket,
        Key=s3_presign_upload_url_request.file_path,
        Fields={
            "Content-Type": s3_presign_upload_url_request.content_type
        },
        Conditions=[
            {"Content-Type": s3_presign_upload_url_request.content_type},
            {"bucket": bucket},
            ["eq", "$key", s3_presign_upload_url_request.file_path]
        ],
        ExpiresIn=expires_in,
    )
    return schemas.file_system.S3PresignUploadURLResponse(
        upload_url=response.get('url'),
        file_path=s3_presign_upload_url_request.file_path,
        fields=response.get('fields'),
        expiration=expiration
    )

@file_system_router.post('/aliyun-oss/presign-upload-url', response_model=schemas.file_system.AliyunOSSPresignUploadURLResponse)
def get_aliyun_oss_presigned_url(presign_upload_url_request: schemas.file_system.AliyunOSSPresignUploadURLRequest,
                                 db: Session = Depends(get_db),
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
    bucket = config.get('bucket')
    
    client = AcsClient(user_access_key_id, user_access_key_secret, region_id)
    request = AssumeRoleRequest()
    request.set_accept_format('json')
    request.set_RoleArn(role_arn)
    request.set_RoleSessionName(role_session_name)
    response = client.do_action_with_exception(request)
    result = json.loads(response)
    
    sts_role_access_key_id = result.get('Credentials').get('AccessKeyId')
    sts_role_access_key_secret = result.get('Credentials').get('AccessKeySecret')
    sts_role_session_token = result.get('Credentials').get('SecurityToken')

    # 创建静态凭证提供者，显式设置临时访问密钥AccessKey ID和AccessKey Secret，以及STS安全令牌
    credentials_provider = oss.credentials.StaticCredentialsProvider(
        access_key_id=sts_role_access_key_id,
        access_key_secret=sts_role_access_key_secret,
        security_token=sts_role_session_token,
    )

    # 加载SDK的默认配置，并设置凭证提供者
    cfg = oss.config.load_default()
    cfg.credentials_provider = credentials_provider

    # 填写Bucket所在地域。以华东1（杭州）为例，Region填写为cn-hangzhou
    cfg.region = region_id

    # 使用配置好的信息创建OSS客户端
    client = oss.Client(cfg)
    # 发送请求以生成指定对象的预签名PUT请求
    
    put_object_request = oss.PutObjectRequest(
        bucket=bucket,
        key=presign_upload_url_request.file_path
    )
    
    if presign_upload_url_request.content_type is not None:
        put_object_request.content_type = presign_upload_url_request.content_type
    
    expires_in = 3600
    
    pre_result = client.presign(
        request=put_object_request,
        expires=timedelta(seconds=expires_in)
    )
    
    return schemas.file_system.AliyunOSSPresignUploadURLResponse(file_path=presign_upload_url_request.file_path,
                                                                 upload_url=pre_result.url,
                                                                 expiration=pre_result.expiration,
                                                                 fields=pre_result.signed_headers)

@file_system_router.post('/detail', response_model=schemas.file_system.FileSystemInfo)
async def get_file_system_info(file_system_info_request: schemas.file_system.FileSystemInfoRequest,
                               db: Session = Depends(get_db),
                               current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_file_system = crud.file_system.get_file_system_by_id(db=db, 
                                                            file_system_id=file_system_info_request.file_system_id)
    if db_file_system is None:
        raise schemas.error.CustomException(code=404, message="File System not found")
    return schemas.file_system.FileSystemInfo.model_validate(db_file_system)

@file_system_router.post('/user-file-system/detail', response_model=schemas.file_system.UserFileSystemInfo)
async def get_user_file_system_info(user_file_system_info_request: schemas.file_system.UserFileSystemInfoRequest,
                                    db: Session = Depends(get_db),
                                    current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_user_file_system = crud.file_system.get_user_file_system_by_id(db=db, 
                                                                      user_file_system_id=user_file_system_info_request.user_file_system_id)
    if db_user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    db_file_system = crud.file_system.get_file_system_by_id(db=db, 
                                                            file_system_id=db_user_file_system.file_system_id)
    if db_file_system is None:
        raise schemas.error.CustomException(code=404, message="File System not found")
    res = schemas.file_system.UserFileSystemInfo(id=db_user_file_system.id,
                                                 file_system_id=db_user_file_system.file_system_id,
                                                 title=db_user_file_system.title,
                                                 description=db_user_file_system.description,
                                                 demo_config=db_file_system.demo_config,
                                                 create_time=db_user_file_system.create_time,
                                                 update_time=db_user_file_system.update_time)
    if db_user_file_system.user_id == current_user.id:
        # only if the user is the owner of the user file system, the config_json will be returned
        res.config_json=db_user_file_system.config_json
    return res

@file_system_router.post("/mine", response_model=schemas.file_system.MineFileSystemSearchResponse)
async def search_mine_file_system(file_system_search_request: schemas.file_system.FileSystemSearchRequest, 
                                  db: Session = Depends(get_db), 
                                  current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    res = []
    db_user_file_systems = crud.file_system.get_user_file_systems_by_user_id(db=db,
                                                                             user_id=current_user.id,
                                                                             keyword=file_system_search_request.keyword)
    typed_user_file_systems = cast(
        list[tuple[models.file_system.UserFileSystem, models.file_system.FileSystem]],
        db_user_file_systems
    )
    for db_user_file_system, db_file_system in typed_user_file_systems:
        item = schemas.file_system.UserFileSystemInfo(
            id=db_user_file_system.id,
            file_system_id=db_user_file_system.file_system_id,
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
    file_systems = crud.file_system.get_all_file_systems(
        db=db, 
        keyword=file_system_search_request.keyword
    )
    return schemas.file_system.ProvideFileSystemSearchResponse(data=file_systems)

@file_system_router.post("/install", response_model=schemas.file_system.FileSystemInstallResponse)
async def install_user_file_system(file_system_install_request: schemas.file_system.FileSystemInstallRequest, 
                                   db: Session = Depends(get_db), 
                                   current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_user_file_system = crud.file_system.create_user_file_system(
        db=db,
        user_id=current_user.id,
        file_system_id=file_system_install_request.file_system_id,
        title=file_system_install_request.title,
        description=file_system_install_request.description,
        config_json=file_system_install_request.config_json
    )
    db.commit()
    return schemas.file_system.FileSystemInstallResponse(user_file_system_id=db_user_file_system.id)

@file_system_router.post("/user-file-system/delete", response_model=schemas.common.NormalResponse)
async def delete_user_file_system(user_file_system_delete_request: schemas.file_system.UserFileSystemDeleteRequest,
                                  db: Session = Depends(get_db),
                                  current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.file_system.delete_user_file_system_by_user_id_and_user_file_system_id(
        db=db,
        user_id=current_user.id,
        user_file_system_id=user_file_system_delete_request.user_file_system_id
    )
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

@file_system_router.post("/generic-s3/upload", response_model=schemas.file_system.GenericFileSystemUploadResponse)
async def upload_file_system(file: UploadFile = File(...),
                             file_path: str = Form(...),
                             content_type: str = Form(...),
                             db: Session = Depends(get_db),
                             current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    content = await file.read()
    user_file_system = crud.file_system.get_user_file_system_by_id(db=db,
                                                                   user_file_system_id=current_user.default_user_file_system)
    if user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    remote_file_service = await get_user_remote_file_system(user_id=current_user.id)
    if remote_file_service.uuid != RemoteFileServiceUUID.Generic_S3.value:
        raise schemas.error.CustomException(code=404, message="The default user file system is not Generic S3")
    generic_s3_remote_file_service = GenericS3RemoteFileService()
    await generic_s3_remote_file_service.init_client_by_user_file_system_id(user_file_system_id=current_user.default_user_file_system)
    await generic_s3_remote_file_service.upload_raw_content_to_path(file_path=file_path,
                                                                    content=content,
                                                                    content_type=content_type)
    return schemas.file_system.GenericFileSystemUploadResponse(file_path=file_path)