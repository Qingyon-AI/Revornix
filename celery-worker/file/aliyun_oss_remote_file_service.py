import asyncio
import json
from typing import Any

import boto3
import alibabacloud_oss_v2 as oss
from aliyunsdkcore.client import AcsClient
from aliyunsdksts.request.v20150401.AssumeRoleRequest import AssumeRoleRequest
from botocore.config import Config

import crud
from common.logger import exception_logger
from data.sql.base import SessionLocal
from enums.file import RemoteFileService
from protocol.remote_file_service import RemoteFileServiceProtocol
from datetime import timedelta


class AliyunOSSRemoteFileService(RemoteFileServiceProtocol):

    def __init__(self):
        super().__init__(
            file_service_uuid=RemoteFileService.AliyunOSS.meta.id,
            file_service_name='Aliyun OSS',
            file_service_name_zh='阿里云OSS',
            file_service_description='Aliyun-OSS File System, Based on Aliyun official OSS, has strong stability and availability, but needs to be charged.',
            file_service_description_zh='Aliyun OSS 文件系统，基于阿里云官方的OSS，具有极强的稳定性和可用性，但需要收费。',
            file_service_demo_config='{"user_access_key_id":"","user_access_key_secret":"","role_arn":"","region_id":"","endpoint_url":"","bucket":""}'
        )
        self.s3_client: Any | None = None
        self.bucket: str | None = None
        self.oss_client: oss.Client | None = None
        
    def presign_get_url(
        self, 
        file_path: str, 
        expires_seconds: int = 3600
    ) -> str:
        # 获取文件的访问URL，由于文件不准公开访问，所以要访问文件必须通过签名URL
        if self.oss_client is None:
            raise Exception("OSS v2 client not initialized")
        if self.bucket is None:
            raise Exception("Bucket not specified")

        pre_result = self.oss_client.presign(
            oss.GetObjectRequest(bucket=self.bucket, key=file_path),
            expires=timedelta(seconds=expires_seconds)
        )
        if pre_result is None or pre_result.url is None:
            raise Exception("Failed to get the presigned URL")

        return pre_result.url

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
                
                config = json.loads(config_str)
                self.file_service_config = config

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
                
                cred = result.get('Credentials')
                
                sts_role_session_token = cred.get('SecurityToken')
                sts_role_access_key_id = cred.get('AccessKeyId')
                sts_role_access_key_secret = cred.get('AccessKeySecret')

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
                self.s3_client = s3
                
                # ------------------------------
                # 1) ✅ 官方 OSS v2 client（给 presign）
                # ------------------------------
                credentials_provider = oss.credentials.StaticCredentialsProvider(
                    sts_role_access_key_id,
                    sts_role_access_key_secret,
                    sts_role_session_token
                )

                cfg = oss.config.load_default()
                cfg.credentials_provider = credentials_provider
                cfg.region = region_id
                cfg.endpoint = endpoint_url
                self.oss_client = oss.Client(cfg)

            except Exception as e:
                exception_logger.error("Failed to initialize the user's file system", exc_info=e)
                raise
            finally:
                db.close()

        await asyncio.to_thread(_init)

    async def get_file_content_by_file_path(
        self,
        file_path: str
    ):
        def _get():
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

        return await asyncio.to_thread(_get)

    async def upload_file_to_path(
        self, 
        file_path, 
        file, 
        content_type
    ):
        def _upload():
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
            return self.s3_client.upload_fileobj(**kwargs)

        return await asyncio.to_thread(_upload)

    async def upload_raw_content_to_path(
        self,
        file_path,
        content,
        content_type: str | None = None
    ):
        def _upload_raw():
            if self.s3_client is None:
                raise Exception("The user's file system has not been initialized")
            kwargs = {
                'Bucket': self.bucket,
                'Key': file_path,
                'Body': content,
            }
            if content_type:
                kwargs['ContentType'] = content_type
            return self.s3_client.put_object(**kwargs)

        return await asyncio.to_thread(_upload_raw)

    async def delete_file(
        self,
        file_path
    ):
        def _delete():
            if self.s3_client is None:
                raise Exception("The user's file system has not been initialized")
            return self.s3_client.delete_object(Bucket=self.bucket, Key=file_path)

        return await asyncio.to_thread(_delete)

    async def list_files(
        self
    ):
        def _list():
            if self.s3_client is None:
                raise Exception("The user's file system has not been initialized")
            return self.s3_client.list_objects_v2(Bucket=self.bucket)

        return await asyncio.to_thread(_list)

async def main():
    from rich import print
    file_service = AliyunOSSRemoteFileService()
    await file_service.init_client_by_user_file_system_id(8)
    res = await file_service.upload_raw_content_to_path(
        file_path='test.txt',
        content='hello world'
    )
    print(res)
    res = await file_service.get_file_content_by_file_path('test.txt')
    print(res)
    res = file_service.presign_get_url(file_path='test.txt')
    print(res)
    import httpx
    async with httpx.AsyncClient() as client:
        res = await client.get(res)
        print(res.text)
    await file_service.delete_file('test.txt')
    files = await file_service.list_files()
    # print(files)

if __name__ == '__main__':
    asyncio.run(main())