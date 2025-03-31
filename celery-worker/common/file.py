import os
import uuid
import time
import httpx
import zipfile
import shutil
import aiofiles
from pydantic import BaseModel
from config.base import BASE_DIR
from common.logger import info_logger

class RemoteFileService():
    
    authorization: str = None
    headers: dict = None
    client: httpx.AsyncClient = None
    base_url: str = None
    
    def __init__(self, authorization: str, base_url: str = os.environ.get('FILE_SERVER_URL')):
        if not base_url:
            raise Exception("The base url of the file backend is not set")
        self.authorization = authorization
        self.headers = {
            "Authorization": f"Bearer {self.authorization}"
        }
        self.client = httpx.AsyncClient(headers=self.headers)
        self.base_url = base_url
    
    async def get_object_content(self, file_path: str):
        res = await self.client.post(url=f'{self.base_url}/file/read', 
                                     json={
                                         "path": file_path
                                         },
                                     headers=self.headers)
        if res.status_code != 200:
            raise Exception("Error occurred while getting file content")
        return res.text
    
    async def get_object_bytes(self, file_path: str):
        res = await self.client.post(url=f'{self.base_url}/file/read', 
                                     json={
                                         "path": file_path
                                         },
                                     headers=self.headers)
        if res.status_code != 200:
            raise Exception("Error occurred while getting file content")
        return res.content
    
    async def put_object(self, remote_file_path: str, local_path: str):
        # 异步读取文件
        async with aiofiles.open(local_path, "rb") as f:
            file_content = await f.read()
        
        files = {
            "file": (local_path, file_content, "application/octet-stream"),
        }

        res = await self.client.post(
            url=f'{self.base_url}/file/upload', 
            files=files, 
            data={"path": remote_file_path},
            headers=self.headers
        )

        if res.status_code != 200:
            raise Exception("Error occurred while putting file content")
        return res
    
    async def put_object_with_raw_data(self, remote_file_path: str, raw_data: bytes):
        res = await self.client.post(
            url=f'{self.base_url}/file/upload/raw', 
            json = {
                "path": remote_file_path,
                "content": raw_data
            },
            headers=self.headers
        )
        if res.status_code != 200:
            raise Exception("Error occurred while putting file content")
        return res

class DownloadRes(BaseModel):
    file_path: str
    file_name: str

async def download_file_to_temp(url: str):
    temp_dir = BASE_DIR / "temp"
    file_name = uuid.uuid4().hex
    file_path = temp_dir / f"{file_name}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()  # Throw exception if the status code is not 200
        async with aiofiles.open(str(file_path), "wb") as file:
            await file.write(response.content)
    return DownloadRes(file_path=str(file_path), file_name=file_name)
        
def extract_files_to_temp_from_zip(file_path: str):
    temp_dir = BASE_DIR / "temp"
    extracted_dir = temp_dir / uuid.uuid4().hex
    # 解压文件到指定文件夹
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        zip_ref.extractall(str(extracted_dir))
    return extracted_dir
    
# TODO: 控制权限以及判断危险性
def delete_temp_file_with_delay(path: str, delay: int):
    if 'temp' not in path:
        raise ValueError("Path must be in temp directory")
    time.sleep(delay)
    if os.path.isdir(path):
        shutil.rmtree(path)  # 递归删除整个文件夹及其内容
        info_logger.warning(f"Deleted folder: {path}")
    elif os.path.isfile(path):
        os.remove(path)  # 删除单个文件
        info_logger.warning(f"Deleted temp file: {path}")
    else:
        info_logger.error(f"Path does not exist: {path}")