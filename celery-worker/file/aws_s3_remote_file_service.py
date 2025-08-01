from dotenv import load_dotenv
load_dotenv(override=True)
import boto3
import crud
import json
from common.sql import SessionLocal
from botocore.client import Config
from protocol.remote_file_service import RemoteFileServiceProtocol

class AWSS3RemoteFileService(RemoteFileServiceProtocol):
    
    s3_client: any = None
    bucket: str = None

    def __init__(self):
        super().__init__(file_service_uuid='01eef562970243af8ba12f6f4ddad3b1',
                         file_service_name='AWS-S3',
                         file_service_name_zh='亚马逊S3',
                         file_service_description="AWS S3, this amazon's paid oss service.",
                         file_service_description_zh='AWS S3，亚马逊云付费存储服务。',
                         file_service_demo_config='{"role_arn":"","user_access_key_id":"","user_access_key_secret":"","region_name":"","endpoint_url":"","bucket":"","url_prefix":""}')

    async def init_client_by_user_file_system_id(self, user_file_system_id: int):
        db = SessionLocal()
        db_user_file_system = crud.file_system.get_user_file_system_by_id(db=db,
                                                                          user_file_system_id=user_file_system_id)
        if db_user_file_system is None:
            raise Exception("User file system not found")
        
        config_str = db_user_file_system.config_json
        self.file_service_config = config_str
        config = json.loads(config_str)
        
        role_arn = config.get('role_arn')
        user_access_key_id = config.get('user_access_key_id')
        user_access_key_secret = config.get('user_access_key_secret')
        region_name = config.get('region_name')
        endpoint_url = config.get('endpoint_url')
        bucket = config.get('bucket')
        self.bucket = bucket

        sts = boto3.client(
            'sts',
            endpoint_url=endpoint_url,
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
            endpoint_url=endpoint_url,
            aws_access_key_id=creds['AccessKeyId'],
            aws_secret_access_key=creds['SecretAccessKey'],
            aws_session_token=creds['SessionToken'],
            config=Config(signature_version='s3v4')
        )
        self.s3_client = s3
        db.close()

    async def get_file_content_by_file_path(self, file_path: str):
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

    async def upload_file_to_path(self, file_path, file, content_type: str | None = None):
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
    
    async def upload_raw_content_to_path(self, file_path, content, content_type: str | None = None):
        kwargs = {
            'Bucket': self.bucket,
            'Key': file_path,
            'Body': content,
        }
        if content_type:
            kwargs['ContentType'] = content_type
        res = self.s3_client.put_object(**kwargs)
        return res
        
    async def delete_file(self, file_path):
        await self.auth()
        res = self.s3_client.delete_object(Bucket=self.bucket, Key=file_path)
        return res
    
    async def list_files(self):
        await self.auth()
        res = self.s3_client.list_objects_v2(Bucket=self.bucket)
        return res