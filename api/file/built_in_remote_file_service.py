import httpx
import crud
from common.sql import SessionLocal
from common.jwt_utils import create_upload_token
from protocol.remote_file_service import RemoteFileServiceProtocol

class BuiltInRemoteFileService(RemoteFileServiceProtocol):
    
    user_id: int = None
    headers: dict = None

    def __init__(self, user_id: int):
        self.user_id = user_id
        
    async def auth(self) -> None:
        db = SessionLocal()
        user = crud.user.get_user_by_id(db=db, 
                                        user_id=self.user_id)
        token = create_upload_token(user=user)
        self.headers = {
            "Authorization": f"Bearer {token}"
        }
    
    async def get_file_content_by_file_path(self, file_path: str):
        if self.headers is None:
            await self.auth()
        with httpx.AsyncClient(headers=self.headers) as client:
            res = await client.post(url=f'{self.base_url}/file/read', 
                                     json={
                                         "path": file_path
                                         },
                                     headers=self.headers)
            if res.status_code != 200:
                raise Exception("Error occurred while getting file content")
            return res.text

    async def upload_raw_content_to_path(self, file_path: str, content: bytes):
        if self.headers is None:
            await self.auth()
        with httpx.AsyncClient(headers=self.headers) as client:
            res = await client.post(url=f'{self.base_url}/file/upload/raw', 
                                     json = {
                                         "path": file_path,
                                         "content": content
                                     },
                                     headers=self.headers)
            if res.status_code != 200:
                raise Exception("Error occurred while putting file content")
            return res