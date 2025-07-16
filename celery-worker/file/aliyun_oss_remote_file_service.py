from dotenv import load_dotenv
load_dotenv(override=True)
import crud
import json
import boto3
from common.sql import SessionLocal
from protocol.remote_file_service import RemoteFileServiceProtocol
from aliyunsdkcore.client import AcsClient
from aliyunsdksts.request.v20150401.AssumeRoleRequest import AssumeRoleRequest
from botocore.config import Config

class AliyunOSSRemoteFileService(RemoteFileServiceProtocol):
    
    user_id: int = None
    oss_client: AcsClient = None
    bucket: str = None
    
    def __init__(self, user_id: int):
        self.user_id = user_id
    
    async def auth(self):
        db = SessionLocal()
        user = crud.user.get_user_by_id(db=db,
                                        user_id=self.user_id)
        if user is None:
            raise Exception("User not found")
        db_user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                                  user_id=self.user_id,
                                                                                                  file_system_id=2)
        if db_user_file_system is None:
            raise Exception("User file system not found")
        
        config_str = db_user_file_system.config_json
        config = json.loads(config_str)
        role_arn = config.get('role_arn')
        role_session_name = config.get('role_session_name')
        user_access_key_id = config.get('user_access_key_id')
        user_access_key_secret = config.get('user_access_key_secret')
        region_id = config.get('region_id')
        oss_endpoint = config.get('oss_endpoint')
        self.bucket = config.get('bucket')

        client = AcsClient(user_access_key_id, user_access_key_secret, region_id)
        request = AssumeRoleRequest()
        request.set_accept_format('json')
        request.set_RoleArn(role_arn)
        request.set_RoleSessionName(role_session_name)

        response = client.do_action_with_exception(request)
        result = json.loads(response)
        sts_role_session_token = result.get('Credentials').get('SecurityToken')
        sts_role_access_key_id = result.get('Credentials').get('AccessKeyId')
        sts_role_access_key_secret = result.get('Credentials').get('AccessKeySecret')

        s3 = boto3.client(
            's3',
            aws_access_key_id=sts_role_access_key_id,
            aws_secret_access_key=sts_role_access_key_secret,
            aws_session_token=sts_role_session_token,
            endpoint_url=oss_endpoint,
            config=Config(s3={"addressing_style": "virtual"},
                          signature_version='v4'))
        self.oss_client = s3
    
    async def get_file_content_by_file_path(self, file_path: str):
        res = self.oss_client.get_object(Bucket=self.bucket, Key=file_path)
        return res
    
    async def upload_file_to_path(self, file_path, file):
        res = self.oss_client.upload_fileobj(file, self.bucket, file_path)
        return res
    
    async def upload_raw_content_to_path(self, file_path, content):
        res = self.oss_client.put_object(Bucket=self.bucket, 
                                         Body=content,
                                         Key=file_path)
        return res
        
    async def delete_file(self, file_path):
        res = self.oss_client.delete_object(Bucket=self.bucket, Key=file_path)
        return res
    
    async def list_files(self):
        res = self.oss_client.list_objects_v2(Bucket=self.bucket)
        return res
    
async def main():
    from rich import print
    service = AliyunOSSRemoteFileService(user_id=1)
    await service.auth()
    files = await service.list_files()
    print(files)
    await service.upload_raw_content_to_path("test/test.txt", "hello world")
    file_content = await service.get_file_content_by_file_path("test/test.txt")
    print(file_content)
    file_content = file_content.get("Body").read()
    print(file_content)
    await service.delete_file("test/test.txt")
    
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())