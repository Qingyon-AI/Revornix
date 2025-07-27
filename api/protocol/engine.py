import crud
import json
from common.sql import SessionLocal
from pydantic import BaseModel
from typing import Protocol
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

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
    
class AsyncChromiumLoader:
    def __init__(self, urls, user_agent=None):
        self.urls = urls
        self.user_agent = user_agent
    async def aload(self):
        # 启动 Playwright
        async with async_playwright() as p:
            # 使用 Chromium 浏览器
            browser = await p.chromium.launch(headless=True)  # headless=True 表示无头浏览器
            # 如果设置了 User-Agent，则设置自定义的 User-Agent
            if self.user_agent:
                context = await browser.new_context(user_agent=self.user_agent)
                page = await context.new_page()
            else:
                page = await browser.new_page()
            # 存储返回的文档内容
            docs = []
            # 加载所有 URL 并获取内容
            for url in self.urls:
                await page.goto(url)
                page_content = await page.content()  # 获取页面 HTML 内容
                page_shot = await page.screenshot()
                docs.append(PageContent(page_content=page_content,
                                        page_shot=page_shot))  # 将页面内容包装成对象存储
            # 关闭浏览器
            await browser.close()
            return docs

class PageContent:
    def __init__(self, page_content=None, page_shot=None):
        self.page_content = page_content
        self.page_shot = page_shot
    def get_text(self):
        return self.page_content
    def get_shot(self):
        return self.page_shot

class EngineProtocol(Protocol):
    
    @staticmethod
    async def get_website_cover_by_playwright(url: str):
        loader_headless = AsyncChromiumLoader([url], user_agent="MyAppUserAgent")
        docs = await loader_headless.aload()
        html = docs[0].page_content
        soup = BeautifulSoup(html, 'html.parser')
        og_cover_meta = soup.find('meta', property='og:image')
        cover = og_cover_meta.attrs['content'] if og_cover_meta is not None else None
        return cover
    
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