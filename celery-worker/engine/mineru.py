import os
import uuid
import shutil
from bs4 import BeautifulSoup
from pathlib import Path
from config.base import BASE_DIR
from protocol.engine import EngineProtocol, WebsiteInfo, FileInfo
from playwright.async_api import async_playwright
from common.common import get_user_remote_file_system
from common.mineru import parse_doc
from common.common import is_dir_empty, extract_title_and_summary

class MineruEngine(EngineProtocol):

    def __init__(self):
        super().__init__(engine_uuid='c59151aa86784d9ab52f74c12c830b1f',
                         engine_name='MinerU',
                         engine_name_zh='MinerU',
                         engine_description='MinerU is an AI-driven file parser that can parse web pages, PDFs, images, etc. into Markdown format and retain the original layout well.',
                         engine_description_zh='MinerU 是 AI驱动的文件解析器，可以将网页、PDF、图片等文件解析为 Markdown 格式并且较好地保留原来的排版。')

    async def analyse_website(self, 
                              url: str):
        temp_dir_name = f'{uuid.uuid4()}'
        temp_shot_img_path = BASE_DIR / 'temp' / temp_dir_name / f'scene-snap.png'
        # 1. open the website and take a screenshot
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url)
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
            remote_file_service = await get_user_remote_file_system(user_id=self.user_id)
            for item in os.listdir(str(BASE_DIR / 'temp' / temp_dir_name / 'scene-snap' / 'auto' / 'images')):
                with open(str(BASE_DIR / 'temp' / temp_dir_name / 'scene-snap' / 'auto' / 'images' / item), "rb") as f:
                    await remote_file_service.upload_file_to_path(file_path=f'images/{item}', 
                                                                  file=f, 
                                                                  content_type='image/png')
        # 3. analyse the base info of the website
        soup = BeautifulSoup(html_content, 'html.parser')
        og_title_meta = soup.find('meta', property='og:title')
        og_description_meta = soup.find('meta', property='og:description')
        normal_title = soup.title
        normal_description = soup.find('meta', attrs={'name': 'description'})
        title = og_title_meta.attrs['content'] if og_title_meta is not None else normal_title.string if normal_title is not None else None
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

    async def analyse_file(self, 
                           file_path: str) -> FileInfo:
        # 1. copy the file and paste it to the temp dir with a random name
        temp_dir_name = f'{uuid.uuid4()}'
        
        pathlib_file_path = Path(file_path)
        file_suffix = pathlib_file_path.suffix
        
        shutil.copy(file_path, str(BASE_DIR / 'temp' / f'{temp_dir_name}{file_suffix}'))

        # 2. convert the file to markdown
        parse_doc(path_list=[str(BASE_DIR / 'temp' / f'{temp_dir_name}{file_suffix}')],
                  output_dir=str(BASE_DIR / 'temp'))
        
        with open(str(BASE_DIR / 'temp' / temp_dir_name / 'auto' / f'{temp_dir_name}.md'), 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 3. analyse the base info of the file
        title, description = extract_title_and_summary(content)
        
        # if the markdown has images in it, upload the images to the remote server
        if not is_dir_empty(str(BASE_DIR / 'temp' / temp_dir_name / 'auto' / 'images')):
            remote_file_service = await get_user_remote_file_system(user_id=self.user_id)
            for item in os.listdir(str(BASE_DIR / 'temp' / temp_dir_name / 'auto' / 'images')):
                with open(str(BASE_DIR / 'temp' / temp_dir_name / 'auto' / 'images' / item), "rb") as f:
                    await remote_file_service.upload_file_to_path(file_path=f'images/{item}', 
                                                                  file=f, 
                                                                  content_type='image/png')

        return FileInfo(title=title,
                        description=description,
                        content=content)