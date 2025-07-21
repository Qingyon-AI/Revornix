from dotenv import load_dotenv
load_dotenv(override=True)
import os
import boto3
import crud
from common.sql import SessionLocal
from botocore.client import Config
from protocol.remote_file_service import RemoteFileServiceProtocol

class BuiltInRemoteFileService(RemoteFileServiceProtocol):
    
    user_id: int = None
    s3_client: any = None
    bucket: str = None

    def __init__(self, user_id: int):
        self.user_id = user_id
        
    async def auth(self) -> None:
        db = SessionLocal()
        user = crud.user.get_user_by_id(db=db, 
                                        user_id=self.user_id)
        if user is None:
            raise Exception("User not found")
        self.bucket = user.uuid
        sts = boto3.client(
            'sts',
            endpoint_url=os.environ.get('FILE_SERVER_URL'),
            aws_access_key_id='minioadmin',
            aws_secret_access_key='minioadmin',
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
            endpoint_url=os.environ.get('FILE_SERVER_URL'),
            aws_access_key_id=creds['AccessKeyId'],
            aws_secret_access_key=creds['SecretAccessKey'],
            aws_session_token=creds['SessionToken'],
            config=Config(signature_version='s3v4'),
            verify=False
        )
        self.s3_client = s3

    async def get_file_content_by_file_path(self, file_path: str):
        await self.auth()
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
        await self.auth()
        
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
        await self.auth()
        
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
       
async def main():
    from rich import print
    service = BuiltInRemoteFileService(user_id=1)
    await service.auth()
    files = await service.list_files()
    print(files)
    await service.upload_raw_content_to_path("test/test.txt", "hello world", "text/plain")
    file_content = await service.get_file_content_by_file_path("test/test.txt")
    print(file_content)
    await service.delete_file("test/test.txt")
    
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())