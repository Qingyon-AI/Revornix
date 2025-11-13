import boto3
import crud
import json
from typing import Any
from common.sql import SessionLocal
from botocore.client import Config
from protocol.remote_file_service import RemoteFileServiceProtocol
from enums.file import RemoteFileServiceUUID

class GenericS3RemoteFileService(RemoteFileServiceProtocol):
    
    s3_client: Any | None = None
    bucket: str | None = None

    def __init__(self):
        super().__init__(
            file_service_uuid=RemoteFileServiceUUID.Generic_S3.value,
            file_service_name='Generic-S3',
            file_service_name_zh='通用S3',
            file_service_description="Generic S3 Service — this can be used as a template for any cloud storage service that supports the S3 protocol.",
            file_service_description_zh='通用S3服务, 任意支持S3协议的云存储服务都可以使用这个作为模版。',
            file_service_demo_config='{"user_access_key_id":"","user_access_key_secret":"","region_name":"","endpoint_url":"","bucket":"","url_prefix":""}'
        )

    async def init_client_by_user_file_system_id(self, user_file_system_id: int):
        db = SessionLocal()
        db_user_file_system = crud.file_system.get_user_file_system_by_id(
            db=db,
            user_file_system_id=user_file_system_id
        )
        if db_user_file_system is None:
            raise Exception("There is something wrong with the user's file system")
        
        config_str = db_user_file_system.config_json
        if config_str is None:
            raise Exception("There is something wrong with the user's file system")
        self.file_service_config = config_str
        config = json.loads(config_str)
        
        user_access_key_id = config.get('user_access_key_id')
        user_access_key_secret = config.get('user_access_key_secret')
        region_name = config.get('region_name')
        endpoint_url = config.get('endpoint_url')
        bucket = config.get('bucket')
        self.bucket = bucket

        s3 = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=user_access_key_id,
            aws_secret_access_key=user_access_key_secret,
            config=Config(signature_version='s3v4',
                          s3={'addressing_style': 'virtual'}),
            region_name=region_name
        )
        self.s3_client = s3
        db.close()

    async def get_file_content_by_file_path(
        self, 
        file_path: str
    ):
        if self.s3_client is None:
            raise Exception("The user's file system has not been initialized")
        res = self.s3_client.get_object(Bucket=self.bucket, Key=file_path)
        content = None
        contentType = res.get('ContentType')
        if contentType == 'text/plain':
            content = res.get('Body').read().decode('utf-8')
        elif "image" in contentType:
            content = res.get('Body').read()
        else:
            content = res.get('Body').read()
        return content

    async def upload_file_to_path(
        self, 
        file_path, 
        file, 
        content_type: str | None = None
    ):
        if self.s3_client is None:
            raise Exception("The user's file system has not been initialized")
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        kwargs = {
            'Fileobj': file,
            'Bucket': self.bucket,
            'Key': file_path,
        }
        if extra_args:
            kwargs['ExtraArgs'] = extra_args
        res = self.s3_client.upload_fileobj(**kwargs)
        return res
    
    async def upload_raw_content_to_path(
        self, 
        file_path, 
        content, 
        content_type: str | None = None
    ):
        if self.s3_client is None:
            raise Exception("The user's file system has not been initialized")
        kwargs = {
            'Bucket': self.bucket,
            'Key': file_path,
            'Body': content,
        }
        if content_type:
            kwargs['ContentType'] = content_type
        res = self.s3_client.put_object(**kwargs)
        return res
        
    async def delete_file(
        self, 
        file_path
    ):
        if self.s3_client is None:
            raise Exception("The user's file system has not been initialized")
        res = self.s3_client.delete_object(Bucket=self.bucket, Key=file_path)
        return res
    
    async def list_files(
        self
    ):
        if self.s3_client is None:
            raise Exception("The user's file system has not been initialized")
        res = self.s3_client.list_objects_v2(Bucket=self.bucket)
        return res