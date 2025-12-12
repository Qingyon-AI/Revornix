import uuid
import httpx
import hashlib
import asyncio
import crud
import aiofiles
import time
import io
from common.file import download_file_to_temp, extract_files_to_temp_from_zip
from pathlib import Path
from config.base import BASE_DIR
from common.common import get_user_remote_file_system, extract_title_and_summary
from protocol.markdown_engine import MarkdownEngineProtocol, WebsiteInfo, FileInfo
from enums.engine import EngineUUID, EngineCategory
from playwright.async_api import async_playwright
from typing import Tuple
from data.sql.base import SessionLocal

class MineruApiEngine(MarkdownEngineProtocol):

    def __init__(self):
        super().__init__(
            engine_uuid=EngineUUID.MinerU_API.value,
            engine_name='MinerU API',
            engine_name_zh='MinerU API',
            engine_category=EngineCategory.Markdown,
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
        engine_config = self.get_engine_config()
        if not engine_config:
            raise Exception("The engine is not initialized yet. Please initialize the engine first.")
        token = engine_config.get("token")
        if not token:
            raise Exception("There is something wrong with the user's configuration of the mineru api engine")

        url = f"https://mineru.net/api/v4/extract-results/batch/{batch_id}"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            return response.json()
    
    async def _get_task_status(self, task_id: str):
        engine_config = self.get_engine_config()
        if not engine_config:
            raise Exception("The engine is not initialized yet. Please initialize the engine first.")
        token = engine_config.get("token")
        if not token:
            raise Exception("There is something wrong with the user's configuration of the mineru api engine")

        url = f'https://mineru.net/api/v4/extract/task/{task_id}'
        headers = {
            'Content-Type': 'application/json',
            "Authorization": f"Bearer {token}"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            return response.json()

    def _verify_callback(self, back_checksum: str, seed: str, content: any):
        engine_config = self.get_engine_config()
        if not engine_config:
            raise Exception("The engine is not initialized yet. Please initialize the engine first.")
        token = engine_config.get("token")
        uid = engine_config.get("uid")
        if not token or not uid:
            raise Exception("There is something wrong with the user's configuration of the mineru api engine")
        
        computed_checksum = self._generate_checksum(
            uid=uid, 
            seed=seed,
            content=content
        )
        return back_checksum == computed_checksum
        
    async def _extract_files(self, file_paths: list[str]) -> list[Tuple[str, str, str]]:
        engine_config = self.get_engine_config()
        if not engine_config:
            raise Exception("Engine is not initialized. Please initialize first.")
        token = engine_config.get("token")
        if not token:
            raise Exception("Invalid MinerU engine configuration: token missing")
        user_id = self.user_id
        if not user_id:
            raise Exception("Engine is not initialized. Please initialize first.")
        db = SessionLocal()
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if not db_user:
            raise Exception("The owner of the engine is not found.")
        if db_user.default_user_file_system is None:
            raise Exception("The owner of the engine has not set a default file system yet.")
        
        try:
            # 1. 请求 MinerU 获取上传 URL 批次
            request_url = "https://mineru.net/api/v4/file-urls/batch"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }

            files_payload = [
                {
                    "name": Path(path).name,
                    "is_ocr": True,
                    "data_id": str(uuid.uuid4())
                }
                for path in file_paths
            ]

            batch_payload = {
                "enable_formula": True,
                "language": "ch",
                "enable_table": True,
                "files": files_payload
            }

            async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=30) as client:
                resp = await client.post(request_url, headers=headers, json=batch_payload)

                if resp.status_code != 200:
                    raise Exception(
                        f"MinerU request failed: {resp.status_code}, {resp.text}"
                    )

                result = resp.json()
                if result.get("code") != 0:
                    raise Exception(
                        f"MinerU apply upload URL failed: {result.get('msg', 'Unknown error')}"
                    )

                batch_id = result["data"]["batch_id"]
                upload_urls = result["data"]["file_urls"]

            # 2. 并发上传文件
            async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=30) as client:

                async def upload_file(idx: int, file_path: str):
                    async with aiofiles.open(file_path, "rb") as f:
                        data = await f.read()

                    upload_resp = await client.put(upload_urls[idx], content=data)
                    if upload_resp.status_code != 200:
                        raise Exception(
                            f"File upload failed: {file_path}, status={upload_resp.status_code}"
                        )

                await asyncio.gather(
                    *(upload_file(i, p) for i, p in enumerate(file_paths))
                )

            # 3. 轮询 MinerU 获取结果
            async def poll_result():
                timeout = 300  # 最长5分钟
                interval = 2
                start_time = time.monotonic()

                while True:
                    status_res = await self._get_batch_status(batch_id)

                    if status_res.get("code") == 0:
                        extract_list = status_res["data"]["extract_result"]

                        all_done = all(item.get("state") != "pending" for item in extract_list)
                        if all_done:
                            return extract_list

                    if time.monotonic() - start_time >= timeout:
                        raise Exception("Timeout waiting for MinerU extraction results (exceeded 5 minutes)")

                    await asyncio.sleep(interval)

            extract_result = await poll_result()

            # 4. 处理结果
            final_data: list[Tuple[str, str, str]] = []

            for item in extract_result:
                if item.get("state") == "failed":
                    raise Exception(f"MinerU extraction failed: {item.get('err_msg')}")

                if item.get("state") != "done":
                    continue

                # 下载并解压
                download_res = await download_file_to_temp(item["full_zip_url"])
                extracted_dir = extract_files_to_temp_from_zip(download_res.file_path)

                # 读取 full.md
                md_path = extracted_dir / "full.md"
                async with aiofiles.open(md_path, "r", encoding="utf-8") as f:
                    content = await f.read()

                title, summary = extract_title_and_summary(content)

                # 上传图片资源
                images_dir = extracted_dir / "images"
                if images_dir.exists() and images_dir.is_dir():
                    remote_file_service = await get_user_remote_file_system(
                        user_id=user_id
                    )
                    await remote_file_service.init_client_by_user_file_system_id(
                        user_file_system_id=db_user.default_user_file_system
                    )
                    async def upload_img(p: Path):
                        async with aiofiles.open(p, "rb") as f:
                            data = await f.read()
                        await remote_file_service.upload_file_to_path(
                            file_path=f"images/{p.name}",
                            file=io.BytesIO(data),
                            content_type="image/png",
                        )
                    await asyncio.gather(*(upload_img(img) for img in images_dir.iterdir()))

                final_data.append((title, summary, content))

            return final_data

        finally:
            db.close()
        
    async def analyse_website(
        self, 
        url: str
    ):
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
    
    async def analyse_file(
        self, 
        file_path: str
    ):
        results = await self._extract_files([file_path])
        
        if not results:
            raise Exception("No results returned from file extraction")
            
        title, description, content = results[0]
        
        return FileInfo(
            title=title,
            description=description,
            content=content
        )