import asyncio

from io import BytesIO
from typing import Any

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.config import Config
from botocore.exceptions import ClientError

import crud
from common.dependencies import check_deployed_by_official_in_fuc
from common.logger import exception_logger, info_logger
from config.file_system import FILE_SYSTEM_PASSWORD, FILE_SYSTEM_SERVER_PUBLIC_URL, FILE_SYSTEM_USER_NAME
from data.sql.base import SessionLocal
from enums.file import RemoteFileService
from protocol.remote_file_service import RemoteFileServiceProtocol


class BuiltInRemoteFileService(RemoteFileServiceProtocol):

    def __init__(self):
        super().__init__(
            file_service_uuid=RemoteFileService.Built_In.meta.id,
            file_service_name='Built-In',
            file_service_name_zh='内置文件系统',
            file_service_description='Built-In file system, based on minio, free to use.',
            file_service_description_zh='内置文件系统，基于minio，可免费使用。',
            file_service_config = {
                "endpoint_url": FILE_SYSTEM_SERVER_PUBLIC_URL,
                "access_key_id": FILE_SYSTEM_USER_NAME,
                "secret_access_key": FILE_SYSTEM_PASSWORD
            }
        )
        self.s3_client: Any | None = None
        self.sts_upload_client: Any | None = None
        self.bucket: str | None = None

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

        # ✅ Built-in 文件系统：强制 bucket policy 为空（禁止公开访问）
        try:
            self.s3_client.delete_bucket_policy(Bucket=self.bucket)
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code not in ("NoSuchBucketPolicy", "NoSuchBucket", "404"):
                raise
    
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
            ExpiresIn=expires_seconds
        )

    async def init_client_by_user_file_system_id(
        self,
        user_file_system_id: int
    ):
        def _init():
            db = SessionLocal()
            deployed_by_official = check_deployed_by_official_in_fuc()
            try:
                if self.file_service_config is None:
                    raise Exception("The user's file system has not been initialized")
                db_user_file_system = crud.file_system.get_user_file_system_by_id(
                    db=db,
                    user_file_system_id=user_file_system_id
                )
                if db_user_file_system is None:
                    raise Exception("There is something wrong with the user's file system")

                user = crud.user.get_user_by_id(
                    db=db,
                    user_id=db_user_file_system.user_id
                )
                if user is None:
                    raise Exception("The user of the file system does not exist")
                
                sts = boto3.client(
                    "sts",
                    endpoint_url=self.file_service_config.get("endpoint_url"),
                    aws_access_key_id=self.file_service_config.get("access_key_id"),
                    aws_secret_access_key=self.file_service_config.get("secret_access_key"),
                    region_name="main",
                    verify=deployed_by_official,
                    config=Config(
                        retries={"max_attempts": 5, "mode": "standard"},
                        connect_timeout=5,
                        read_timeout=30,
                    ),
                )
                self.sts_upload_client = sts

                resp = sts.assume_role(
                    RoleArn='arn:aws:iam::minio:role/upload-policy',  # minio会忽略这一参数
                    RoleSessionName='upload-session',
                    DurationSeconds=3600
                )
                creds = resp['Credentials']
                if creds is None:
                    raise Exception("Failed to get the user's file system's STS credentials")
                s3 = boto3.client(
                    's3',
                    endpoint_url=self.file_service_config.get("endpoint_url"),
                    aws_access_key_id=creds['AccessKeyId'],
                    aws_secret_access_key=creds['SecretAccessKey'],
                    aws_session_token=creds['SessionToken'],
                    region_name="main",
                    config=Config(
                        signature_version="s3v4",
                        retries={"max_attempts": 5, "mode": "standard"},
                        connect_timeout=5,
                        read_timeout=60,
                    ),
                    verify=deployed_by_official
                )
                self.s3_client = s3
                
                self.bucket = user.uuid
                
                self.ensure_bucket_exists()
            except Exception as e:
                exception_logger.error(f"Init User File System Error: {e}")
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
        file_path: str,
        file: BytesIO,
        content_type: str | None = None
    ):
        """上传文件到文件服务器的指定路径

        Args:
            file_path (str): 文件服务器中的指定路径
            file (BytesIO): 要上传的文件对象
            content_type (str | None, optional): 文件的MIME类型，默认不设置
        """
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
        """将原始内容上传到文件服务器的指定路径打包成文件

        Args:
            file_path (str): 文件服务器中的指定路径
            content (bytes | str): 文件的原始内容
            content_type (str | None, optional): 文件的MIME类型，默认不设置
        """
        def _upload_raw():
            if self.s3_client is None:
                raise Exception("The user's file system has not been initialized")

            # str → bytes
            if isinstance(content, str):
                body = content.encode("utf-8")
            else:
                body = content

            fileobj = BytesIO(body)

            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type

            config = TransferConfig(
                multipart_threshold=8 * 1024 * 1024,  # 8MB 以上自动 multipart
                multipart_chunksize=8 * 1024 * 1024,
                max_concurrency=4,
                use_threads=True,
            )

            self.s3_client.upload_fileobj(
                Fileobj=fileobj,
                Bucket=self.bucket,
                Key=file_path,
                ExtraArgs=extra_args if extra_args else None,
                Config=config,
            )

        return await asyncio.to_thread(_upload_raw)

    async def delete_file(self, file_path):
        def _delete():
            if self.s3_client is None:
                raise Exception("The user's file system has not been initialized")
            return self.s3_client.delete_object(Bucket=self.bucket, Key=file_path)

        return await asyncio.to_thread(_delete)

    async def list_files(self):
        def _list():
            if self.s3_client is None:
                raise Exception("The user's file system has not been initialized")
            return self.s3_client.list_objects_v2(Bucket=self.bucket)

        return await asyncio.to_thread(_list)

# 测试一下
async def main():
    from rich import print
    file_service = BuiltInRemoteFileService()
    await file_service.init_client_by_user_file_system_id(5)
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
    print(files)

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())