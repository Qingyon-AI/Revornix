import os
import httpx
import aiofiles

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
        
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close_client()
        
    async def close_client(self):
        if self.client and not self.client.is_closed:
            await self.client.aclose()
    
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