import httpx
import io
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from markitdown import MarkItDown

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
    
async def transform_html_to_markdown_by_markitdown(html: str):
    md = MarkItDown()
    stream = io.BytesIO(html.encode('utf-8'))
    result = md.convert_stream(stream)
    return result

async def crawer_website_by_jina(url: str, apikey: str):
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Bearer {apikey}'
    }
    timeout = httpx.Timeout(10.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
        response = await client.get(f'https://r.jina.ai/{url}', headers=headers)
        title = response.json().get('data').get('title')
        description = response.json().get('data').get('description')
        content = response.json().get('data').get('content')
        return {
            'title': title,
            'description': description,
            'content': content
        }

async def crawer_website_by_playwright(url: str):
    loader_headless = AsyncChromiumLoader([url], user_agent="MyAppUserAgent")
    docs = await loader_headless.aload()
    html_content = docs[0].page_content
    content = (await transform_html_to_markdown_by_markitdown(html_content)).text_content
    soup = BeautifulSoup(html_content, 'html.parser')
    og_title_meta = soup.find('meta', property='og:title')
    og_description_meta = soup.find('meta', property='og:description')
    normal_title = soup.title.string
    normal_description = soup.find('meta', attrs={'name': 'description'})
    title = og_title_meta.attrs['content'] if og_title_meta is not None else normal_title if normal_title is not None else None
    description = og_description_meta.attrs['content'] if og_description_meta is not None else normal_description['content'] if normal_description is not None else None
    return {
        'title': title,
        'description': description,
        'content': content
    }
    
async def get_website_cover_by_playwright(url: str):
    loader_headless = AsyncChromiumLoader([url], user_agent="MyAppUserAgent")
    docs = await loader_headless.aload()
    html = docs[0].page_content
    soup = BeautifulSoup(html, 'html.parser')
    og_cover_meta = soup.find('meta', property='og:image')
    cover = og_cover_meta.attrs['content'] if og_cover_meta is not None else None
    return cover
    
if __name__ == "__main__":
    import asyncio
    from rich import print
    result1 = asyncio.run(crawer_website_by_playwright("https://medium.com/@dineshraghupatruni/exploring-microsoft-markitdown-practical-use-cases-with-llama-and-llava-integration-96ad3ed5576d"))
    print('result1:', result1)
    result2 = asyncio.run(crawer_website_by_jina("https://www.baidu.com", apikey="jina_f428ddadb6c4486592a0fd271591b861H6Kn42fdh8gU1PLX_9aXCKcP7L2f"))
    print('result2:', result2)