import httpx
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from pydantic import BaseModel

from common.logger import exception_logger
from api.base_implement.engine_base import EngineBase


class WebsiteInfo(BaseModel):
    url: str
    title: str
    description: str | None = None
    keywords: str | None = None
    content: str | None = None
    cover: str | None = None

class FileInfo(BaseModel):
    title: str
    description: str | None = None
    keywords: str | None = None
    content: str | None = None
    cover: str | None = None

class MarkdownEngineBase(EngineBase):
    @staticmethod
    async def get_website_cover_by_playwright(
        url: str
    ) -> str | None:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url)
            html_content = await page.content()
            await browser.close()

        soup = BeautifulSoup(html_content, "html.parser")

        # 提取 og:image
        og = soup.find('meta', property='og:image')
        if og and og.get('content'):
            return str(og.get("content"))

        # 提取 twitter:image
        twitter = soup.find('meta', attrs={'name': 'twitter:image'})
        if twitter and twitter.get('content'):
            return str(twitter.get("content"))

        # 图片查找
        imgs = soup.find_all("img")
        if not imgs:
            return None

        from urllib.parse import urljoin

        def normalize_src(base: str, src: str) -> str:
            if src.startswith(("http://", "https://")):
                return src
            if src.startswith("//"):
                return "https:" + src
            return urljoin(base, src)

        timeout = httpx.Timeout(10.0, connect=5.0)
        biggest_url = None
        biggest_size = 0

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            for img in imgs:
                raw = img.get("src") or img.get("data-src")
                if not raw:
                    continue

                src = normalize_src(url, str(raw))

                try:
                    head = await client.head(src)
                    size = int(head.headers.get("Content-Length", 0))
                except Exception as e:
                    exception_logger.error(f"Failed to get image size: {src}, error: {e}")
                    continue

                if size > biggest_size:
                    biggest_size = size
                    biggest_url = src

        return biggest_url

    async def analyse_website(
        self,
        url: str
    ) -> WebsiteInfo:
        raise NotImplementedError("Method not implemented")

    async def analyse_file(
        self,
        file_path: str
    ) -> FileInfo:
        raise NotImplementedError("Method not implemented")
