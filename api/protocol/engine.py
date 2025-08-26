import crud
import json
import httpx
from common.sql import SessionLocal
from pydantic import BaseModel
from typing import Protocol
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from enums.engine import EngineUUID

class WebsiteInfo(BaseModel):
    url: str | None = None
    title: str | None = None
    description: str | None = None
    keywords: str | None = None
    content: str | None = None
    cover: str | None = None

class FileInfo(BaseModel):
    title: str | None = None
    description: str | None = None
    keywords: str | None = None
    content: str | None = None
    cover: str | None = None

class EngineProtocol(Protocol):
    
    @staticmethod
    async def get_website_cover_by_playwright(url: str):
        html_content = None
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url)
            html_content = await page.content()
            await browser.close()
        soup = BeautifulSoup(html_content, 'html.parser')

        og = soup.find('meta', property='og:image')
        if og and og.get('content'):
            return og['content']
        
        twitter = soup.find('meta', attrs={'name': 'twitter:image'})
        if twitter and twitter.get('content'):
            return twitter['content']
        
        imgs = soup.find_all('img')
        biggest_img_url = None
        biggest_area = 0
        for img in imgs:
            src = img.get('src') or img.get('data-src')
            if not src:
                continue

            # 下面请求图片大小，这里为了速度和简洁，简单用Content-Length估计大小，
            try:
                head = httpx.head(src, timeout=5)
                size = int(head.headers.get('Content-Length', 0))
            except:
                size = 0

            if size > biggest_area:
                biggest_area = size
                biggest_img_url = src

            return biggest_img_url

        return None
    
    def __init__(self, 
                 engine_uuid: str,
                 engine_name: str | None = None, 
                 engine_name_zh: str | None = None, 
                 engine_description: str | None = None, 
                 engine_description_zh: str | None = None, 
                 engine_demo_config: str | None = None,
                 engine_config: str | None = None):
        self.engine_uuid = engine_uuid
        self.engine_name = engine_name
        self.engine_name_zh = engine_name_zh
        self.engine_description = engine_description
        self.engine_description_zh = engine_description_zh
        self.engine_demo_config = engine_demo_config
        self.engine_config = engine_config
    
    def get_engine_config(self):
        if self.engine_config is not None:
            return json.loads(self.engine_config)
        return None
    
    async def init_engine_config_by_user_engine_id(self, user_engine_id: int):
        db = SessionLocal()
        db_user_engine = crud.engine.get_user_engine_by_user_engine_id(db=db, 
                                                                       user_engine_id=user_engine_id)
        self.user_id = db_user_engine.user_id
        db_engine = crud.engine.get_engine_by_id(db=db,
                                                 id=db_user_engine.engine_id)
        if db_engine is None:
            raise Exception('Engine not found')
        if db_engine.uuid != self.engine_uuid:
            raise Exception('Engine uuid not match')
        self.engine_config = db_user_engine.config_json
        db.close()
    
    async def analyse_website(self, url: str) -> WebsiteInfo:
        raise NotImplementedError("Method not implemented")
    
    async def analyse_file(self, file_path: str) -> FileInfo:
        raise NotImplementedError("Method not implemented")