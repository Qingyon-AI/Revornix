from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

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
                docs.append(PageContent(page_content))  # 将页面内容包装成对象存储

            # 关闭浏览器
            await browser.close()

            return docs

class PageContent:
    def __init__(self, page_content):
        self.page_content = page_content

    def get_text(self):
        return self.page_content

async def crawer_website(url: str):
    loader_headless = AsyncChromiumLoader([url], user_agent="MyAppUserAgent")
    docs = await loader_headless.aload()
    html = docs[0].page_content
    soup = BeautifulSoup(html, 'html.parser')
    og_title_meta = soup.find('meta', property='og:title')
    og_cover_meta = soup.find('meta', property='og:image')
    og_description_meta = soup.find('meta', property='og:description')
    normal_title = soup.title.string
    normal_description = soup.find('meta', attrs={'name': 'description'})
    cover = og_cover_meta.attrs['content'] if og_cover_meta is not None else None
    title = og_title_meta.attrs['content'] if og_title_meta is not None else normal_title if normal_title is not None else None
    description = og_description_meta.attrs['content'] if og_description_meta is not None else normal_description['content'] if normal_description is not None else None
    return {
        'title': title,
        'description': description,
        'cover': cover,
        'html': html
    }
    
if __name__ == "__main__":
    import asyncio
    result = asyncio.run(crawer_website("https://www.baidu.com"))
    print(result.get('title'))
    print(result.get('description'))
    print(result.get('cover'))