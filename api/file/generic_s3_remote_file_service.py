import asyncio
from typing import Any

import boto3
from botocore.config import Config

from common.logger import exception_logger, info_logger
from enums.file import RemoteFileService
from protocol.remote_file_service import RemoteFileServiceProtocol
from botocore.exceptions import ClientError


class GenericS3RemoteFileService(RemoteFileServiceProtocol):

    def __init__(self):
        super().__init__(
            file_service_uuid=RemoteFileService.Generic_S3.meta.id,
            file_service_name='Generic-S3',
            file_service_name_zh='通用S3',
            file_service_description="Generic S3 Service — this can be used as a template for any cloud storage service that supports the S3 protocol.",
            file_service_description_zh='通用S3服务, 任意支持S3协议的云存储服务都可以使用这个作为模版。',
            file_service_demo_config='{"user_access_key_id":"","user_access_key_secret":"","region_name":"","endpoint_url":"","bucket":""}'
        )
        self.s3_client: Any | None = None
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

    async def init_client(
        self,
    ):
        def _init():
            try:
                file_service_config = self.get_config()
                if file_service_config is None:
                    raise Exception("File service config is not specified")

                user_access_key_id = file_service_config.get('user_access_key_id')
                user_access_key_secret = file_service_config.get('user_access_key_secret')
                region_name = file_service_config.get('region_name')
                endpoint_url = file_service_config.get('endpoint_url')
                bucket = file_service_config.get('bucket')

                self.bucket = bucket

                s3 = boto3.client(
                    's3',
                    endpoint_url=endpoint_url,
                    aws_access_key_id=user_access_key_id,
                    aws_secret_access_key=user_access_key_secret,
                    config=Config(
                        signature_version='s3v4',
                        retries={"max_attempts": 5, "mode": "standard"},
                        connect_timeout=5,
                        read_timeout=30,
                        s3={
                            'addressing_style': 'virtual'
                        },
                        request_checksum_calculation="when_required",
                        response_checksum_validation="when_required",
                    ),
                    region_name=region_name
                )
                self.s3_client = s3
                
                self.ensure_bucket_exists()
            except Exception as e:
                exception_logger.error(f"Failed to initialize the user's file system, {e}")
                raise

        await asyncio.to_thread(_init)
    
    def empty_bucket(self):
        """清空指定桶中的所有文件
        """
        if self.s3_client is None:
            raise Exception("s3 client is not initialized")

        bucket = self.s3_client.Bucket(self.bucket)
        versioning = bucket.Versioning().status

        if versioning == 'Enabled':
            bucket.object_versions.delete()
        else:
            bucket.objects.all().delete()

    def delete_bucket(self):
        """删除指定桶
        """
        if self.s3_client is None:
            raise Exception("s3 client is not initialized")
        
        bucket = self.s3_client.Bucket(self.bucket)
        try:
            bucket.delete()
            info_logger.info(f"Delete Bucket Successfully: {self.bucket}")
        except ClientError as e:
            exception_logger.error(f"Deleted Bucket Error: {e.response['Error']['Message']}",)
            raise

    def ensure_bucket_exists(self):
        """确保桶存在，如果不存在则创建，注意桶访问权限必须不能是公开的
        """
        if self.s3_client is None:
            raise Exception("s3 client is not initialized")
        
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
        except ClientError as e:
            status = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            code = e.response.get("Error", {}).get("Code")
            if status == 404 or code in ("NoSuchBucket", "NotFound", "404", "400"):
                self.s3_client.create_bucket(Bucket=self.bucket)
            elif status == 403 or code in ("403", "AccessDenied"):
                raise Exception("Access denied. You may not have permission to create this bucket.") from e
            else:
                raise

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
        content_type: str | None = None
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

            if isinstance(content, str):
                body = content.encode("utf-8")
            else:
                body = content

            kwargs = {"Bucket": self.bucket, "Key": file_path, "Body": body}
            if content_type:
                kwargs["ContentType"] = content_type

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