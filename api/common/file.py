import uuid
import httpx
import zipfile
from pydantic import BaseModel
from config.base import BASE_DIR
from common.logger import info_logger
from tenacity import retry, stop_after_attempt, wait_fixed

class DownloadRes(BaseModel):
    file_path: str
    file_name: str

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def download_file_to_temp(url: str):
    temp_dir = BASE_DIR / "temp"
    file_name = uuid.uuid4().hex
    file_path = temp_dir / f"{file_name}"
    info_logger.info(f"Downloading file from {url} to {file_path}")
    
    # Some MinerU APIs only support requests from ip located in china
    # NOTE: If you are not located in China, you can remove the proxy=None and trust_env=False parameters. Besides, please use an IP proxy located in the China region.
    async with httpx.AsyncClient(proxy=None, trust_env=False) as client:
        response = await client.get(url)
        response.raise_for_status()  # throw exception if the status code is not 200
        with open(str(file_path), "wb") as file:
            file.write(response.content)
            return DownloadRes(file_path=str(file_path), file_name=file_name)
        
def extract_files_to_temp_from_zip(file_path: str):
    temp_dir = BASE_DIR / "temp"
    extracted_dir = temp_dir / uuid.uuid4().hex
    # 解压文件到指定文件夹
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        zip_ref.extractall(str(extracted_dir))
    return extracted_dir