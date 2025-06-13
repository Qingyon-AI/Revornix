import json
from pydantic import BaseModel
from typing import Protocol
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

class WebsiteInfo(BaseModel):
    url: str | None = None
    title: str | None = None
    description: str | None = None
    keywords: list | None = None
    content: str | None = None
    cover: str | None = None

class FileInfo(BaseModel):
    title: str | None = None
    description: str | None = None
    keywords: list | None = None
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
    
    def __init__(self, engine_name: str | None = None, engine_version: str | None = None, engine_description: str | None = None, engin_config: str | None = None):
        self.engine_name = engine_name
        self.engine_version = engine_version
        self.engine_description = engine_description
        self.engin_config = engin_config

    def get_engine_name(self) -> str:
        return self.engine_name

    def get_engine_version(self) -> str:
        return self.engine_version

    def get_engine_description(self) -> str:
        return self.engine_description
    
    def get_engine_config(self) -> dict:
        return json.loads(self.engin_config) if self.engin_config else None
    
    async def analyse_website(self, url: str) -> WebsiteInfo:
        pass
    
    async def analyse_file(self, file_path: str) -> FileInfo:
        pass
    
    