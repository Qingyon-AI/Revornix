import uuid
import httpx
import hashlib
import asyncio
from common.file import download_file_to_temp, extract_files_to_temp_from_zip
from pathlib import Path
from config.base import BASE_DIR
from common.common import get_user_remote_file_system, extract_title_and_summary
from protocol.engine import EngineProtocol, WebsiteInfo, FileInfo
from enums.engine import EngineUUID
from playwright.async_api import async_playwright
import aiofiles
from typing import Tuple

class MineruApiEngine(EngineProtocol):

    def __init__(self):
        super().__init__(
            engine_uuid=EngineUUID.MinerU_API.value,
            engine_name='MinerU API',
            engine_name_zh='MinerU API',
            engine_description='MinerU API is an AI-driven file parser provided by MinerU official, which can parse files such as webpages, PDFs, and images into Markdown format while retaining the original layout well.',
            engine_description_zh='MinerU API 是 MinerU官方提供的AI驱动的文件解析器，可以将网页、PDF、图片等文件解析为 Markdown 格式并且较好地保留原来的排版。',
            engine_demo_config='{"token": "******", "uid": "******"}'
        )
    
    def _generate_checksum(self, uid: str, seed: str, content: str) -> str:
        data = f"{uid}{seed}{content}"
        sha256_hash = hashlib.sha256()
        sha256_hash.update(data.encode('utf-8'))
        return sha256_hash.hexdigest()
    
    async def _get_batch_status(self, batch_id: str):
        token = self.get_engine_config().get('token')
        url = f"https://mineru.net/api/v4/extract-results/batch/{batch_id}"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            return response.json()
    
    async def _get_task_status(self, task_id: str):
        token = self.get_engine_config().get('token')
        url = f'https://mineru.net/api/v4/extract/task/{task_id}'
        headers = {
            'Content-Type': 'application/json',
            "Authorization": f"Bearer {token}"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            return response.json()

    def _verify_callback(self, back_checksum: str, seed: str, content: any):
        uid = self.get_engine_config().get('uid')
        computed_checksum = self._generate_checksum(
            uid=uid, 
            seed=seed,
            content=content
        )
        return back_checksum == computed_checksum
        
    async def _extract_files(self, file_paths: list[str]) -> list[Tuple[str, str, str]]:
        res_data = []
        token = self.get_engine_config().get('token')
        url = "https://mineru.net/api/v4/file-urls/batch"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        files = [{"name": Path(file_path).name, "is_ocr": True, "data_id": str(uuid.uuid4())} 
                 for file_path in file_paths]
        
        data = {
            "enable_formula": True,
            "language": "ch",
            "enable_table": True,
            "files": files
        }
        
        # Some MinerU APIs only support requests from ip located in chain
        async with httpx.AsyncClient(proxies=None) as client:
            response = await client.post(url, headers=headers, json=data)
            
            if response.status_code == 200:
                result = response.json()
                if result["code"] == 0:
                    batch_id = result["data"]["batch_id"]
                    urls = result["data"]["file_urls"]
                    
                    # 上传文件
                    for i, file_path in enumerate(file_paths):
                        async with aiofiles.open(file_path, 'rb') as f:
                            file_data = await f.read()
                            res_upload = await client.put(urls[i], data=file_data)
                            if res_upload.status_code == 200:
                                print(f"{urls[i]} upload success")
                            else:
                                print(f"{urls[i]} upload failed")
                                raise Exception(f"File upload failed: {res_upload.status_code}")
                    
                    # 轮询获取结果
                    max_attempts = 60  # 最多尝试60次
                    attempt = 0
                    
                    while attempt < max_attempts:
                        result = await self._get_batch_status(batch_id=batch_id)
                        if result["code"] == 0:
                            extract_result = result["data"]["extract_result"]
                            all_done = True
                            
                            for item in extract_result:
                                status = item.get("state", "pending")
                                if status == "done":
                                    # 下载并解压文件
                                    download_res = await download_file_to_temp(item["full_zip_url"])
                                    extracted_dir = extract_files_to_temp_from_zip(download_res.file_path)
                                    
                                    # 提取标题和摘要
                                    md_file_path = extracted_dir / 'full.md'
                                    async with aiofiles.open(md_file_path, 'r', encoding='utf-8') as f:
                                        content = await f.read()
                                    title, description = extract_title_and_summary(content)
                                    
                                    # 上传图片到远程文件系统
                                    images_file_path = extracted_dir / 'images'
                                    remote_file_service = await get_user_remote_file_system(user_id=self.user_id)
                                    
                                    if images_file_path.exists() and images_file_path.is_dir():
                                        for image_file in images_file_path.iterdir():
                                            with open(image_file, "rb") as img_f:
                                                await remote_file_service.upload_file_to_path(
                                                    file_path=f'images/{image_file.name}', 
                                                    file=img_f, 
                                                    content_type='image/png'
                                                )
                                    
                                    res_data.append((title, description, content))
                                    
                                elif status == "failed":
                                    raise Exception(f'Extract failed, reason: {item.get("err_msg", "Unknown error")}')
                                else:
                                    all_done = False
                            
                            if all_done:
                                break
                        
                        attempt += 1
                        await asyncio.sleep(2)  # 每2秒检查一次
                    
                    if attempt >= max_attempts:
                        raise Exception("Timeout waiting for extraction results")
                    
                    return res_data
                else:
                    raise Exception(f'Apply upload url failed, reason: {result.get("msg", "Unknown error")}')
            else:
                raise Exception(f'Response not successful. Status: {response.status_code}, Result: {response.text}')
        
    async def analyse_website(self, url: str) -> WebsiteInfo:
        temp_dir_name = f'{uuid.uuid4()}'
        temp_dir = BASE_DIR / 'temp' / temp_dir_name
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        temp_shot_pdf_path = temp_dir / f'scene-snap.pdf'
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url)
            await page.pdf(path=str(temp_shot_pdf_path))
            await browser.close()
            
        results = await self._extract_files([str(temp_shot_pdf_path)])
            
        if not results:
            raise Exception("No results returned from file extraction")
            
        title, description, content = results[0]
        
        return WebsiteInfo(
            url=url,
            title=title,
            description=description,
            content=content,
            cover=await self.get_website_cover_by_playwright(url)
        )
    
    async def analyse_file(self, file_path: str) -> FileInfo:
        results = await self._extract_files([file_path])
        
        if not results:
            raise Exception("No results returned from file extraction")
            
        title, description, content = results[0]
        
        return FileInfo(
            title=title,
            description=description,
            content=content
        )