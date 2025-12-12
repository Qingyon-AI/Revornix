import os
import uuid
import shutil
import aiofiles
import crud
import io
from bs4 import BeautifulSoup
from pathlib import Path
from config.base import BASE_DIR
from protocol.markdown_engine import MarkdownEngineProtocol, WebsiteInfo, FileInfo
from enums.engine import EngineUUID
from playwright.async_api import async_playwright
from common.common import get_user_remote_file_system, is_dir_empty, extract_title_and_summary
from common.mineru import parse_doc
from data.sql.base import SessionLocal


class MineruEngine(MarkdownEngineProtocol):

    def __init__(self):
        super().__init__(
            engine_uuid=EngineUUID.MinerU.value,
            engine_name='MinerU',
            engine_name_zh='MinerU',
            engine_description='MinerU is an AI-driven file parser that converts web pages, PDFs, images, etc. into Markdown format with layout retention.',
            engine_description_zh='MinerU 是 AI驱动的文件解析器，可以将网页、PDF、图片等文件解析为 Markdown，并较好保留排版。'
        )

    # -------------------------------
    # Analyse Website
    # -------------------------------
    async def analyse_website(self, url: str) -> WebsiteInfo:
        # Check user
        if not self.user_id:
            raise Exception("Engine is not initialized. Please initialize first.")

        db = SessionLocal()
        try:
            db_user = crud.user.get_user_by_id(db=db, user_id=self.user_id)
            if not db_user:
                raise Exception("The owner of the engine is not found.")
            if db_user.default_user_file_system is None:
                raise Exception("The owner of the engine has not set a default file system yet.")

            # temp dir
            temp_dir = BASE_DIR / 'temp' / str(uuid.uuid4())
            shot_pdf_path = temp_dir / "scene-snap.pdf"
            md_output_dir = temp_dir / "scene-snap" / "auto"
            os.makedirs(temp_dir, exist_ok=True)

            # 1. Snapshot web page
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                await page.goto(url, wait_until="domcontentloaded")
                html_content = await page.content()
                await page.pdf(path=shot_pdf_path)
                await browser.close()

            # 2. PDF -> Markdown
            parse_doc([shot_pdf_path], output_dir=str(temp_dir))

            md_path = md_output_dir / "scene-snap.md"
            async with aiofiles.open(md_path, "r", encoding="utf-8") as f:
                content = await f.read()

            # 3. Upload extracted images
            images_dir = md_output_dir / "images"
            if images_dir.exists() and images_dir.is_dir() and not is_dir_empty(images_dir):
                remote_fs = await get_user_remote_file_system(self.user_id)
                await remote_fs.init_client_by_user_file_system_id(db_user.default_user_file_system)

                for img_file in images_dir.iterdir():
                    async with aiofiles.open(img_file, "rb") as f:
                        img_data = await f.read()
                    await remote_fs.upload_file_to_path(
                        file_path=f'images/{img_file.name}',
                        file=io.BytesIO(img_data),
                        content_type="image/png",
                    )

            # 4. Analyse HTML metadata
            soup = BeautifulSoup(html_content, "html.parser")

            # 标题提取：优先 og:title，其次 <title>
            og_title_meta = soup.find("meta", property="og:title")
            normal_title_tag = soup.title

            title: str = "Unknown Title"
            if og_title_meta is not None:
                title = str(og_title_meta.get("content"))
            if not title and normal_title_tag is not None:
                # 有些页面 title 可能是 None
                title = str(normal_title_tag.string.strip()) if normal_title_tag.string else "Unknown Title"

            # 描述提取：优先 og:description，其次 meta[name=description]
            og_description_meta = soup.find("meta", property="og:description")
            normal_description_meta = soup.find("meta", attrs={"name": "description"})

            description: str | None = None
            if og_description_meta is not None:
                description = str(og_description_meta.get("content"))
            if not description and normal_description_meta is not None:
                description = str(normal_description_meta.get("content"))

            # 关键字提取
            keywords_meta = soup.find("meta", attrs={"name": "keywords"})
            keywords = str(keywords_meta.get("content")) if keywords_meta else None

            # 5. 封面图获取（可以考虑后续改造成复用当前 soup/HTML，避免再次 Playwright 打开）
            cover = await self.get_website_cover_by_playwright(url)

            return WebsiteInfo(
                url=url,
                title=title,
                description=description,
                content=content,
                cover=cover,
                keywords=keywords
            )

        finally:
            db.close()
            shutil.rmtree(temp_dir, ignore_errors=True)

    # -------------------------------
    # Analyse File
    # -------------------------------
    async def analyse_file(self, file_path: str) -> FileInfo:
        if not self.user_id:
            raise Exception("Engine is not initialized. Please initialize first.")

        temp_id = str(uuid.uuid4())
        pathlib_file_path = Path(file_path)
        suffix = pathlib_file_path.suffix

        # temp paths
        temp_file_path = BASE_DIR / "temp" / f"{temp_id}{suffix}"
        md_output_dir = BASE_DIR / "temp" / temp_id / "auto"
        os.makedirs(BASE_DIR / "temp", exist_ok=True)
        
        db = SessionLocal()
        try:
            db_user = crud.user.get_user_by_id(db=db, user_id=self.user_id)
            if not db_user:
                raise Exception("The owner of the engine is not found.")
            if db_user.default_user_file_system is None:
                raise Exception("The owner of the engine has not set a default file system yet.")
            
            # 1. Copy to temp
            shutil.copy(file_path, temp_file_path)

            # 2. Convert via MinerU
            parse_doc([temp_file_path], output_dir=str(BASE_DIR / "temp"))

            md_path = md_output_dir / f"{temp_id}.md"
            async with aiofiles.open(md_path, "r", encoding="utf-8") as f:
                content = await f.read()

            # 3. Extract Title + Summary
            title, description = extract_title_and_summary(content)

            # 4. Upload images
            images_dir = md_output_dir / "images"
            if images_dir.exists() and images_dir.is_dir() and not is_dir_empty(images_dir):
                remote_fs = await get_user_remote_file_system(self.user_id)
                await remote_fs.init_client_by_user_file_system_id(db_user.default_user_file_system)

                for img_file in images_dir.iterdir():
                    async with aiofiles.open(img_file, "rb") as f:
                        img_data = await f.read()
                    await remote_fs.upload_file_to_path(
                        file_path=f"images/{img_file.name}",
                        file=io.BytesIO(img_data),
                        content_type="image/png",
                    )

            return FileInfo(
                title=title,
                description=description,
                content=content,
            )

        finally:
            shutil.rmtree(BASE_DIR / "temp" / temp_id, ignore_errors=True)
            if temp_file_path.exists():
                temp_file_path.unlink(missing_ok=True)