from datetime import datetime, timedelta, timezone
from typing import cast

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db
from enums.file import RemoteFileService
from proxy.file_system_proxy import FileSystemProxy
from common.encrypt import encrypt_file_system_config, decrypt_file_system_config
from file.generic_s3_remote_file_service import GenericS3RemoteFileService
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService

file_system_router = APIRouter()


@file_system_router.post("/built-in/presign-upload-url", response_model=schemas.file_system.S3PresignUploadURLResponse)
def get_built_in_presigned_url(
    s3_presign_upload_url_request: schemas.file_system.S3PresignUploadURLRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    expires_in = 3600
    now = datetime.now(timezone.utc)
    
    file_service = BuiltInRemoteFileService()
    expiration = now + timedelta(seconds=expires_in)
    response = file_service.presign_put_url(
        file_path=s3_presign_upload_url_request.file_path,
        content_type=s3_presign_upload_url_request.content_type,
        expires_in=3600
    )
    return schemas.file_system.S3PresignUploadURLResponse(
        upload_url=response.get('url'),
        file_path=s3_presign_upload_url_request.file_path,
        fields=response.get('fields'),
        expiration=expiration
    )

@file_system_router.post("/aws-s3/presign-upload-url", response_model=schemas.file_system.S3PresignUploadURLResponse)
def get_aws_s3_presigned_url(
    s3_presign_upload_url_request: schemas.file_system.S3PresignUploadURLRequest,
    current_user: models.user.User = Depends(get_current_user)
):
    expires_in = 3600
    now = datetime.now(timezone.utc)
    
    file_service = AWSS3RemoteFileService()
    expiration = now + timedelta(seconds=expires_in)
    response = file_service.presign_put_url(
        file_path=s3_presign_upload_url_request.file_path,
        content_type=s3_presign_upload_url_request.content_type,
        expires_in=expires_in
    )
    return schemas.file_system.S3PresignUploadURLResponse(
        upload_url=response.get('url'),
        file_path=s3_presign_upload_url_request.file_path,
        fields=response.get('fields'),
        expiration=expiration
    )

@file_system_router.post('/aliyun-oss/presign-upload-url', response_model=schemas.file_system.AliyunOSSPresignUploadURLResponse)
def get_aliyun_oss_presigned_url(
    presign_upload_url_request: schemas.file_system.S3PresignUploadURLRequest,
    current_user: models.user.User = Depends(get_current_user)
):
    file_service = AliyunOSSRemoteFileService()
    pre_result = file_service.presign_put_url(
        file_path=presign_upload_url_request.file_path,
        content_type=presign_upload_url_request.content_type,
        expires_in=3600
    )
    
    if pre_result.url is None or pre_result.signed_headers is None or pre_result.expiration is None:
        raise Exception("Failed to get presigned URL")
    
    return schemas.file_system.AliyunOSSPresignUploadURLResponse(
        file_path=presign_upload_url_request.file_path,
        upload_url=pre_result.url,
        expiration=pre_result.expiration
    )

@file_system_router.post('/detail', response_model=schemas.file_system.FileSystemInfo)
def get_file_system_info(
    file_system_info_request: schemas.file_system.FileSystemInfoRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    db_file_system = crud.file_system.get_file_system_by_id(
        db=db,
        file_system_id=file_system_info_request.file_system_id
    )
    if db_file_system is None:
        raise schemas.error.CustomException(code=404, message="File System not found")
    return schemas.file_system.FileSystemInfo.model_validate(db_file_system)

@file_system_router.post('/user-file-system/detail', response_model=schemas.file_system.UserFileSystemDetail)
def get_user_file_system_info(
    user_file_system_info_request: schemas.file_system.UserFileSystemInfoRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    db_user_file_system = crud.file_system.get_user_file_system_by_id(
        db=db,
        user_file_system_id=user_file_system_info_request.user_file_system_id
    )
    if db_user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    db_file_system = crud.file_system.get_file_system_by_id(
        db=db,
        file_system_id=db_user_file_system.file_system_id
    )
    if db_file_system is None:
        raise schemas.error.CustomException(code=404, message="File System not found")
    res = schemas.file_system.UserFileSystemDetail(
        id=db_user_file_system.id,
        file_system_id=db_user_file_system.file_system_id,
        title=db_user_file_system.title,
        description=db_user_file_system.description,
        demo_config=db_file_system.demo_config,
        create_time=db_user_file_system.create_time,
        update_time=db_user_file_system.update_time
    )
    if db_user_file_system.user_id == current_user.id and db_user_file_system.config_json is not None:
        # only if the user is the owner of the user file system, the config_json will be returned
        res.config_json=decrypt_file_system_config(db_user_file_system.config_json)
    return res

@file_system_router.post("/mine", response_model=schemas.file_system.MineFileSystemSearchResponse)
def search_mine_file_system(
    file_system_search_request: schemas.file_system.FileSystemSearchRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    res = []
    db_user_file_systems = crud.file_system.get_user_file_systems_by_user_id(
        db=db,
        user_id=current_user.id,
        keyword=file_system_search_request.keyword
    )
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
            create_time=db_user_file_system.create_time,
            update_time=db_user_file_system.update_time,
            demo_config=db_file_system.demo_config
        )
        res.append(item)
    return schemas.file_system.MineFileSystemSearchResponse(data=res)

@file_system_router.post("/provide", response_model=schemas.file_system.ProvideFileSystemSearchResponse)
def provide_file_system(
    file_system_search_request: schemas.file_system.FileSystemSearchRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    db_file_systems = crud.file_system.get_all_file_systems(
        db=db,
        keyword=file_system_search_request.keyword
    )
    file_systems = [
        schemas.file_system.FileSystemInfo.model_validate(db_file_system, from_attributes=True) for db_file_system in db_file_systems
    ]
    return schemas.file_system.ProvideFileSystemSearchResponse(data=file_systems)

@file_system_router.post("/install", response_model=schemas.file_system.FileSystemInstallResponse)
def install_user_file_system(
    file_system_install_request: schemas.file_system.FileSystemInstallRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
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
def delete_user_file_system(
    user_file_system_delete_request: schemas.file_system.UserFileSystemDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    crud.file_system.delete_user_file_system_by_user_id_and_user_file_system_id(
        db=db,
        user_id=current_user.id,
        user_file_system_id=user_file_system_delete_request.user_file_system_id
    )
    db.commit()
    return schemas.common.SuccessResponse()

@file_system_router.post("/update", response_model=schemas.common.NormalResponse)
def update_file_system(
    user_file_system_update_request: schemas.file_system.UserFileSystemUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    user_file_system = crud.file_system.get_user_file_system_by_id(
        db=db,
        user_file_system_id=user_file_system_update_request.user_file_system_id
    )
    if user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    else:
        if user_file_system_update_request.title is not None:
            user_file_system.title = user_file_system_update_request.title
        if user_file_system_update_request.description is not None:
            user_file_system.description = user_file_system_update_request.description
        if user_file_system_update_request.config_json is not None:
            user_file_system.config_json = encrypt_file_system_config(user_file_system_update_request.config_json)
        user_file_system.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@file_system_router.post("/generic-s3/upload", response_model=schemas.file_system.GenericFileSystemUploadResponse)
async def upload_file_system(
    file: UploadFile = File(...),
    file_path: str = Form(...),
    content_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    default_user_file_system = current_user.default_user_file_system
    if default_user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")

    content = await file.read()
    user_file_system = crud.file_system.get_user_file_system_by_id(
        db=db,
        user_file_system_id=default_user_file_system
    )
    if user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    remote_file_service = await FileSystemProxy.create(
        user_id=current_user.id
    )
    if remote_file_service is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    if remote_file_service.file_service_uuid != RemoteFileService.Generic_S3.meta.id:
        raise schemas.error.CustomException(code=404, message="The default user file system is not Generic S3")
    generic_s3_remote_file_service = GenericS3RemoteFileService()
    await generic_s3_remote_file_service.upload_raw_content_to_path(
        file_path=file_path,
        content=content,
        content_type=content_type
    )
    return schemas.file_system.GenericFileSystemUploadResponse(
        file_path=file_path
    )
