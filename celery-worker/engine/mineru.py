import uuid
import os
from config.base import BASE_DIR
from bs4 import BeautifulSoup
from common.mineru import parse_doc
from playwright.async_api import async_playwright
from protocol.engine import EngineProtocol, WebsiteInfo
from common.file import RemoteFileService
from common.common import create_upload_token, is_dir_empty
from common.sql import SessionLocal
from crud.user import get_user_by_id

class MineruEngine(EngineProtocol):
    def __init__(self, engine_name = None, engine_version = None, engine_description = None, engine_config = None, user_id = None):
        super().__init__(engine_name, engine_version, engine_description, engine_config)
        self.user_id = user_id
    async def analyse_website(self, url: str):
        temp_dir_name = f'{uuid.uuid4()}'
        temp_shot_img_path = BASE_DIR / 'temp' / temp_dir_name / f'scene-snap.png'
        # 1. open the website and take a screenshot
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle")
            html_content = await page.content()
            await page.screenshot(path=str(temp_shot_img_path), full_page=True)
            await browser.close()
        # 2. convert the image to markdown
        parse_doc(path_list=[str(temp_shot_img_path)],
                  output_dir=str(BASE_DIR / 'temp' / temp_dir_name))
        with open(str(BASE_DIR / 'temp' / temp_dir_name / 'scene-snap' / 'auto' / f'scene-snap.md'), 'r', encoding='utf-8') as f:
            content = f.read()
        # if the markdown has images in it, upload the images to the remote server
        if not is_dir_empty(str(BASE_DIR / 'temp' / temp_dir_name / 'scene-snap' / 'auto' / 'images')):
            db = SessionLocal()
            db_user = get_user_by_id(db=db, user_id=self.user_id)
            authorization = create_upload_token(db_user)
            remote_file_service = RemoteFileService(authorization=authorization)
            for item in os.listdir(str(BASE_DIR / 'temp' / temp_dir_name / 'scene-snap' / 'auto' / 'images')):
                await remote_file_service.put_object(remote_file_path=f'images/{item}',
                                                    local_path=str(BASE_DIR / 'temp' / temp_dir_name / 'scene-snap' / 'auto' / 'images' / item))
            await remote_file_service.close_client()
            # replace the url of the images in the markdown (if needed)
            # content = content.replace('', '')
        # 3. analyse the base info of the website
        soup = BeautifulSoup(html_content, 'html.parser')
        og_title_meta = soup.find('meta', property='og:title')
        og_description_meta = soup.find('meta', property='og:description')
        normal_title = soup.title.string
        normal_description = soup.find('meta', attrs={'name': 'description'})
        title = og_title_meta.attrs['content'] if og_title_meta is not None else normal_title if normal_title is not None else None
        description = og_description_meta.attrs['content'] if og_description_meta is not None else normal_description['content'] if normal_description is not None else None
        og_cover_meta = soup.find('meta', property='og:image')
        cover = og_cover_meta.attrs['content'] if og_cover_meta is not None else None
        keywords_meta = soup.find('meta', attrs={'name': 'keywords'})
        keywords = keywords_meta['content'] if keywords_meta else None
        return WebsiteInfo(
            url=url,
            title=title,
            description=description,
            content=content,
            cover=cover,
            keywords=keywords
        )

if __name__ == '__main__':
    import asyncio
    engine = MineruEngine()
    result = asyncio.run(
        engine.analyse_website('https://kinda.info/post/bd43b6d9-e9dc-45ef-bc0e-c21fc6ce8b7d')
    )
    print(result)