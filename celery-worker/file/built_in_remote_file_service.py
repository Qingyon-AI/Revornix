import boto3
import crud
import json
import asyncio
from typing import Any
from config.file_system import FILE_SYSTEM_USER_NAME, FILE_SYSTEM_PASSWORD, FILE_SYSTEM_SERVER_PUBLIC_URL
from data.sql.base import SessionLocal
from botocore.client import Config
from botocore.exceptions import ClientError
from protocol.remote_file_service import RemoteFileServiceProtocol
from enums.file import RemoteFileService

class BuiltInRemoteFileService(RemoteFileServiceProtocol):
    
    s3_client: Any | None = None
    bucket: str | None = None

    def __init__(self):
        super().__init__(
            file_service_uuid=RemoteFileService.Built_In.meta.id,
            file_service_name='Built-In',
            file_service_name_zh='内置文件系统',
            file_service_description='Built-In file system, based on minio, free to use.',
            file_service_description_zh='内置文件系统，基于minio，可免费使用。'
        )

    @staticmethod
    def empty_bucket(
        bucket_name: str
    ):
        s3 = boto3.resource(
            's3',
            endpoint_url=FILE_SYSTEM_SERVER_PUBLIC_URL,
            aws_access_key_id=FILE_SYSTEM_USER_NAME,
            aws_secret_access_key=FILE_SYSTEM_PASSWORD,
            config=Config(signature_version='s3v4'),
            verify=False
        )
        bucket = s3.Bucket(bucket_name)
        versioning = bucket.Versioning().status

        if versioning == 'Enabled':
            bucket.object_versions.delete()
        else:
            bucket.objects.all().delete()

    @staticmethod
    def delete_bucket(
        bucket_name: str
    ):
        BuiltInRemoteFileService.empty_bucket(bucket_name)
        s3 = boto3.resource('s3',
            endpoint_url=FILE_SYSTEM_SERVER_PUBLIC_URL,
            aws_access_key_id=FILE_SYSTEM_USER_NAME,
            aws_secret_access_key=FILE_SYSTEM_PASSWORD,
            config=Config(signature_version='s3v4'),
            verify=False
        )
        bucket = s3.Bucket(bucket_name)
        try:
            bucket.delete()
            print(f"Bucket `{bucket_name}` 删除成功")
        except ClientError as e:
            print("删除失败:", e.response['Error']['Message'])
            raise
    
    @staticmethod
    def ensure_bucket_exists(bucket_name: str):
        s3 = boto3.client(
            's3',
            endpoint_url=FILE_SYSTEM_SERVER_PUBLIC_URL,
            aws_access_key_id=FILE_SYSTEM_USER_NAME,
            aws_secret_access_key=FILE_SYSTEM_PASSWORD,
            config=Config(signature_version='s3v4'),
            verify=False
        )
        try:
            s3.head_bucket(Bucket=bucket_name)
        except ClientError as e:
            code = e.response['Error']['Code']
            if code in ['404', '400']:
                s3.create_bucket(Bucket=bucket_name)
                # 公开读策略
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [{
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                    }]
                }
                s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
            elif code == '403':
                raise Exception("Access denied. You may not have permission to create this bucket.")
            else:
                raise
        
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

                user = crud.user.get_user_by_id(
                    db=db,
                    user_id=db_user_file_system.user_id
                )
                if user is None:
                    raise Exception("The user of the file system does not exist")
                self.ensure_bucket_exists(bucket_name=user.uuid)
                self.bucket = user.uuid
                sts = boto3.client(
                    'sts',
                    endpoint_url=FILE_SYSTEM_SERVER_PUBLIC_URL,
                    aws_access_key_id=FILE_SYSTEM_USER_NAME,
                    aws_secret_access_key=FILE_SYSTEM_PASSWORD,
                    config=Config(signature_version='s3v4'),
                    region_name="main"
                )
                resp = sts.assume_role(
                    RoleArn='arn:aws:iam::minio:role/upload-policy',  # minio会忽略这一参数
                    RoleSessionName='upload-session',
                    DurationSeconds=3600
                )
                creds = resp['Credentials']
                s3 = boto3.client(
                    's3',
                    endpoint_url=FILE_SYSTEM_SERVER_PUBLIC_URL,
                    aws_access_key_id=creds['AccessKeyId'],
                    aws_secret_access_key=creds['SecretAccessKey'],
                    aws_session_token=creds['SessionToken'],
                    config=Config(signature_version='s3v4'),
                    verify=False
                )
                self.s3_client = s3
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
    
    async def upload_raw_content_to_path(self, file_path, content, content_type: str | None = None):
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
