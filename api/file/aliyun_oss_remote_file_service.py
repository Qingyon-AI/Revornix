import crud
import json
import boto3
import asyncio
from typing import Any
from data.sql.base import SessionLocal
from protocol.remote_file_service import RemoteFileServiceProtocol
from enums.file import RemoteFileServiceUUID
from aliyunsdkcore.client import AcsClient
from aliyunsdksts.request.v20150401.AssumeRoleRequest import AssumeRoleRequest
from botocore.config import Config

class AliyunOSSRemoteFileService(RemoteFileServiceProtocol):
    
    oss_client: Any | None = None
    bucket: str | None = None
    
    def __init__(self):
        super().__init__(
            file_service_uuid=RemoteFileServiceUUID.AliyunOSS.value,
            file_service_name='Aliyun OSS',
            file_service_name_zh='阿里云OSS',
            file_service_description='Aliyun-OSS File System, Based on Aliyun official OSS, has strong stability and availability, but needs to be charged.',
            file_service_description_zh='Aliyun OSS 文件系统，基于阿里云官方的OSS，具有极强的稳定性和可用性，但需要收费。',
            file_service_demo_config='{"role_arn":"","user_access_key_id":"","user_access_key_secret":"","region_id":"","endpoint_url":"","bucket":"","url_prefix":""}'
        )
    
    async def init_client_by_user_file_system_id(
        self, 
        user_file_system_id: int
    ):
        def _init():
            db = SessionLocal()
            try:
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

                role_arn = config.get('role_arn')
                user_access_key_id = config.get('user_access_key_id')
                user_access_key_secret = config.get('user_access_key_secret')
                region_id = config.get('region_id')
                endpoint_url = config.get('endpoint_url')
                self.bucket = config.get('bucket')

                client = AcsClient(user_access_key_id, user_access_key_secret, region_id)
                request = AssumeRoleRequest()
                request.set_accept_format('json')
                request.set_RoleArn(role_arn)
                request.set_RoleSessionName('oss-session')

                response = client.do_action_with_exception(request)
                if response is None:
                    raise Exception("Failed to get the user's file system's STS credentials")
                result = json.loads(response)
                sts_role_session_token = result.get('Credentials').get('SecurityToken')
                sts_role_access_key_id = result.get('Credentials').get('AccessKeyId')
                sts_role_access_key_secret = result.get('Credentials').get('AccessKeySecret')

                config = Config(
                    s3={"addressing_style": "virtual"},
                    signature_version='s3'
                )

                s3 = boto3.client(
                    's3',
                    aws_access_key_id=sts_role_access_key_id,
                    aws_secret_access_key=sts_role_access_key_secret,
                    aws_session_token=sts_role_session_token,
                    endpoint_url=endpoint_url,
                    config=config
                )
                self.oss_client = s3
            finally:
                db.close()

        await asyncio.to_thread(_init)
    
    async def get_file_content_by_file_path(
        self, 
        file_path: str
    ):
        def _get():
            if self.oss_client is None:
                raise Exception("The user's file system has not been initialized")
            res = self.oss_client.get_object(Bucket=self.bucket, Key=file_path)
            content = None
            contentType = res.get('ContentType')
            if contentType == 'text/plain':
                content = res.get('Body').read().decode('utf-8')
            elif "image" in contentType:
                content = res.get('Body').read()
            else:
                content = res.get('Body').read()
            return content

        return await asyncio.to_thread(_get)
    
    async def upload_file_to_path(self, file_path, file, content_type: str | None = None):
        def _upload():
            if self.oss_client is None:
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
            return self.oss_client.upload_fileobj(**kwargs)

        return await asyncio.to_thread(_upload)
    
    async def upload_raw_content_to_path(
        self, 
        file_path, 
        content, 
        content_type: str | None = None
    ):
        def _upload_raw():
            if self.oss_client is None:
                raise Exception("The user's file system has not been initialized")
            kwargs = {
                'Bucket': self.bucket,
                'Key': file_path,
                'Body': content,
            }
            if content_type:
                kwargs['ContentType'] = content_type
            return self.oss_client.put_object(**kwargs)

        return await asyncio.to_thread(_upload_raw)
        
    async def delete_file(
        self, 
        file_path
    ):
        def _delete():
            if self.oss_client is None:
                raise Exception("The user's file system has not been initialized")
            return self.oss_client.delete_object(Bucket=self.bucket, Key=file_path)

        return await asyncio.to_thread(_delete)
    
    async def list_files(
        self
    ):
        def _list():
            if self.oss_client is None:
                raise Exception("The user's file system has not been initialized")
            return self.oss_client.list_objects_v2(Bucket=self.bucket)

        return await asyncio.to_thread(_list)
