import httpx
from protocol.engine import EngineProtocol
from bs4 import BeautifulSoup
from pydantic import BaseModel
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

class MarkdownEngineProtocol(EngineProtocol):
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
    
    async def analyse_website(self, url: str) -> WebsiteInfo:
        raise NotImplementedError("Method not implemented")
    
    async def analyse_file(self, file_path: str) -> FileInfo:
        raise NotImplementedError("Method not implemented")