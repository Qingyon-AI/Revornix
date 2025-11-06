import io
from protocol.markdown_engine import MarkdownEngineProtocol, WebsiteInfo, FileInfo
from enums.engine import EngineUUID
from common.common import extract_title_and_summary
from bs4 import BeautifulSoup
from markitdown import MarkItDown
from openai import OpenAI
from playwright.async_api import async_playwright

class MarkitdownEngine(MarkdownEngineProtocol):
    
    def __init__(self):
        super().__init__(engine_uuid=EngineUUID.MarkitDown.value,
                         engine_name="Markitdown",
                         engine_name_zh="Markitdown",
                         engine_description="Markitdown is a tool that converts file to Markdown.",
                         engine_description_zh="Markitdown 是一个将文件转换为 Markdown 的工具。",
                         engine_demo_config='{"openai_api_key": "sk-proj-******"}')
    
    async def analyse_website(self, url: str):  
        llm_client = OpenAI(api_key=self.get_engine_config().get("openai_api_key"))
        html_content = None
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url)
            html_content = await page.content()
            await browser.close()
        md = MarkItDown(llm_client=llm_client, llm_model="gpt-4o-mini")
        stream = io.BytesIO(html_content.encode('utf-8'))
        content = md.convert_stream(stream).text_content
        soup = BeautifulSoup(html_content, 'html.parser')
        og_title_meta = soup.find('meta', property='og:title')
        og_description_meta = soup.find('meta', property='og:description')
        normal_title = soup.title.string
        normal_description = soup.find('meta', attrs={'name': 'description'})
        title = og_title_meta.attrs['content'] if og_title_meta is not None else normal_title if normal_title is not None else None
        description = og_description_meta.attrs['content'] if og_description_meta is not None else normal_description['content'] if normal_description is not None else None
        keywords_meta = soup.find('meta', attrs={'name': 'keywords'})
        keywords = keywords_meta['content'] if keywords_meta else None
        return WebsiteInfo(
            url=url,
            title=title,
            description=description,
            content=content,
            cover=await self.get_website_cover_by_playwright(url),
            keywords=keywords
        )
        
    async def analyse_file(self, file_path: str) -> FileInfo:
        llm_client = OpenAI(api_key=self.get_engine_config().get("openai_api_key"))
        md = MarkItDown(llm_client=llm_client, llm_model="gpt-4o-mini")
        result = md.convert(file_path)
        
        title, description = extract_title_and_summary(result.text_content)
        
        return FileInfo(title=title,
                        description=description,
                        content=result.text_content)