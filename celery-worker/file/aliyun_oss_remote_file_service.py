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
    
    oss_client: AcsClient = None
    bucket: str = None
    
    def __init__(self):
        super().__init__(file_service_uuid='41be24fa741f4716b8dc0ccef3980655',
                         file_service_name='Aliyun OSS',
                         file_service_name_zh='阿里云OSS',
                         file_service_description='Aliyun-OSS File System, Based on Aliyun official OSS, has strong stability and availability, but needs to be charged.',
                         file_service_description_zh='Aliyun OSS 文件系统，基于阿里云官方的OSS，具有极强的稳定性和可用性，但需要收费。',
                         file_service_demo_config='{"role_arn":"","user_access_key_id":"","user_access_key_secret":"","region_id":"","endpoint_url":"","bucket":"","url_prefix":""}')
    
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
        region_id = config.get('region_id')
        endpoint_url = config.get('endpoint_url')
        self.bucket = config.get('bucket')

        client = AcsClient(user_access_key_id, user_access_key_secret, region_id)
        request = AssumeRoleRequest()
        request.set_accept_format('json')
        request.set_RoleArn(role_arn)
        request.set_RoleSessionName('oss-session')

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
            endpoint_url=endpoint_url,
            config=Config(s3={"addressing_style": "virtual"},
                          signature_version='v4'))
        self.oss_client = s3
        db.close()
    
    async def get_file_content_by_file_path(self, file_path: str):
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
        res = self.oss_client.upload_fileobj(**kwargs)
        return res
    
    async def upload_raw_content_to_path(self, file_path, content, content_type: str | None = None):
        kwargs = {
            'Bucket': self.bucket,
            'Key': file_path,
            'Body': content,
        }
        if content_type:
            kwargs['ContentType'] = content_type
        res = self.oss_client.put_object(**kwargs)
        return res
        
    async def delete_file(self, file_path):
        res = self.oss_client.delete_object(Bucket=self.bucket, Key=file_path)
        return res
    
    async def list_files(self):
        res = self.oss_client.list_objects_v2(Bucket=self.bucket)
        return res