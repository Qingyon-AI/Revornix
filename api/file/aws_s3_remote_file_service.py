import asyncio
from typing import Any

import boto3
from botocore.client import Config

from common.logger import exception_logger
from enums.file import RemoteFileService
from protocol.remote_file_service import RemoteFileServiceProtocol


class AWSS3RemoteFileService(RemoteFileServiceProtocol):

    def __init__(self):
        super().__init__(
            file_service_uuid=RemoteFileService.AWS_S3.meta.id,
            file_service_name='AWS-S3',
            file_service_name_zh='亚马逊S3',
            file_service_description="AWS S3, this amazon's paid oss service.",
            file_service_description_zh='AWS S3，亚马逊云付费存储服务。',
            file_service_demo_config='{"user_access_key_id":"","user_access_key_secret":"","role_arn":"","region_name":"","bucket":""}'
        )
        self.s3_client: Any | None = None
        self.sts_upload_client: Any | None = None
        self.bucket: str | None = None
    
    def presign_get_url(
        self, 
        file_path: str, 
        expires_seconds: int = 3600
    ) -> str:
        # 获取文件的访问URL，由于文件不准公开访问，所以要访问文件必须通过签名URL
        if self.s3_client is None:
            raise Exception("S3 client not specified")
        if self.bucket is None:
            raise Exception("Bucket not specified")
        return self.s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket, "Key": file_path},
            ExpiresIn=expires_seconds,
        )
    
    def presign_put_url(
        self,
        file_path: str,
        content_type: str | None = None,
        expires_in: int = 3600
    ):
        if self.s3_client is None:
            raise Exception("S3 client not specified")
        if self.bucket is None:
            raise Exception("Bucket not specified")
        response = self.s3_client.generate_presigned_post(
            Bucket=self.bucket,
            Key=file_path,
            Fields={
                "Content-Type": content_type
            },
            Conditions=[
                {"Content-Type": content_type},
                {"bucket": self.bucket},
                ["eq", "$key", file_path]
            ],
            ExpiresIn=expires_in,
        )
        return response

    async def init_client(
        self,
    ):
        def _init():
            try:
                file_service_config = self.get_config()
                if file_service_config is None:
                    raise Exception("File service config not specified")

                role_arn = file_service_config.get('role_arn')
                user_access_key_id = file_service_config.get('user_access_key_id')
                user_access_key_secret = file_service_config.get('user_access_key_secret')
                region_name = file_service_config.get('region_name')
                bucket = file_service_config.get('bucket')
                
                self.bucket = bucket

                sts = boto3.client(
                    'sts',
                    aws_access_key_id=user_access_key_id,
                    aws_secret_access_key=user_access_key_secret,
                    region_name=region_name,
                    config=Config(
                        retries={"max_attempts": 5, "mode": "standard"},
                        connect_timeout=5,
                        read_timeout=30,
                    ),
                )
                self.sts_upload_client = sts
                
                resp = sts.assume_role(
                    RoleArn=role_arn,
                    RoleSessionName='s3-session',
                    DurationSeconds=3600
                )
                creds = resp['Credentials']
                if creds is None:
                    raise Exception("Failed to get the user's file system's STS credentials")
                s3 = boto3.client(
                    's3',
                    aws_access_key_id=creds['AccessKeyId'],
                    aws_secret_access_key=creds['SecretAccessKey'],
                    aws_session_token=creds['SessionToken'],
                    region_name=region_name,
                    config=Config(
                        signature_version="s3v4",
                        retries={"max_attempts": 5, "mode": "standard"},
                        connect_timeout=5,
                        read_timeout=60,
                    )
                )
                self.s3_client = s3
            except Exception as e:
                exception_logger.error(f"Failed to initialize the user's file system: {e}")
                raise

        await asyncio.to_thread(_init)

    async def get_file_content_by_file_path(
        self,
        file_path
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
        content_type: str | None = None
    ):
        def _upload():
            if self.s3_client is None:
                raise Exception("The user's file system has not been initialized")
            try:
                file.seek(0)
            except Exception:
                pass
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
            
            # str → bytes
            if isinstance(content, str):
                body = content.encode("utf-8")
            else:
                body = content

            kwargs = {
                'Bucket': self.bucket,
                'Key': file_path,
                'Body': body,
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
