import io
import asyncio
from protocol.markdown_engine import MarkdownEngineProtocol, WebsiteInfo, FileInfo
from enums.engine import Engine, EngineCategory
from common.common import extract_title_and_summary
from bs4 import BeautifulSoup
from markitdown import MarkItDown
from langfuse.openai import OpenAI
from langfuse import propagate_attributes
from playwright.async_api import async_playwright

class MarkitdownEngine(MarkdownEngineProtocol):
    
    def __init__(self):
        super().__init__(
            engine_uuid=Engine.MarkitDown.meta.uuid,
            engine_name="Markitdown",
            engine_name_zh="Markitdown",
            engine_category=EngineCategory.Markdown,
            engine_description="Markitdown is a tool that converts file to Markdown.",
            engine_description_zh="Markitdown 是一个将文件转换为 Markdown 的工具。",
            engine_demo_config='{"openai_api_key": "sk-proj-******"}'
        )
    
    async def analyse_website(
        self,
        url: str
    ) -> WebsiteInfo:
        # 1. 读取引擎配置 & 校验
        engine_config = self.get_engine_config()
        if not engine_config:
            raise Exception(
                "The engine is not initialized yet. Please initialize the engine first."
            )

        api_key = engine_config.get("openai_api_key")
        if not api_key:
            raise Exception(
                "There is something wrong with the user's configuration of the markitdown engine"
            )

        # 2. 用 Playwright 获取 HTML
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            # 可以适当等到网络空闲，页面更稳定
            await page.goto(url, wait_until="domcontentloaded")
            html_content = await page.content()
            await browser.close()

        if not self.user_id:
            raise Exception("The user_id is not set.")
        with propagate_attributes(user_id=str(self.user_id)):
            # 3. 用 MarkItDown 转 Markdown / 文本（这是同步的，用 to_thread 防止阻塞 event loop）
            llm_client = OpenAI(
                api_key=api_key
            )
            md = MarkItDown(llm_client=llm_client, llm_model="gpt-4o-mini")

            stream = io.BytesIO(html_content.encode("utf-8"))
            md_result = await asyncio.to_thread(md.convert_stream, stream)
            content = md_result.text_content

            # 4. 用 BeautifulSoup 解析 meta 信息
            soup = BeautifulSoup(html_content, "html.parser")

            # 标题提取：优先 og:title，其次 <title>
            og_title_meta = soup.find("meta", property="og:title")
            normal_title_tag = soup.title

            title: str = "Unknown Title"
            if og_title_meta is not None:
                title = str(og_title_meta.get("content"))
            if not title and normal_title_tag is not None:
                # 有些页面 title 可能是 None
                title = str(normal_title_tag.string.strip()) if normal_title_tag.string else "Unknown Title"

            # 描述提取：优先 og:description，其次 meta[name=description]
            og_description_meta = soup.find("meta", property="og:description")
            normal_description_meta = soup.find("meta", attrs={"name": "description"})

            description: str | None = None
            if og_description_meta is not None:
                description = str(og_description_meta.get("content"))
            if not description and normal_description_meta is not None:
                description = str(normal_description_meta.get("content"))

            # 关键字提取
            keywords_meta = soup.find("meta", attrs={"name": "keywords"})
            keywords = str(keywords_meta.get("content")) if keywords_meta else None

            # 5. 封面图获取（可以考虑后续改造成复用当前 soup/HTML，避免再次 Playwright 打开）
            cover = await self.get_website_cover_by_playwright(url)

            return WebsiteInfo(
                url=url,
                title=title,
                description=description,
                content=content,
                cover=cover,
                keywords=keywords
            )
            
    async def analyse_file(
        self, 
        file_path: str
    ):
        engine_config = self.get_engine_config()
        if engine_config is None:
            raise Exception("The engine is not initialized yet. Please initialize the engine first.")
        api_key = engine_config.get("openai_api_key")
        if api_key is None:
            raise Exception("There is something wrong with the user's configuration of the markitdown engine")
        
        if not self.user_id:
            raise Exception("The user_id is not set.")
        with propagate_attributes(user_id=str(self.user_id)):
            llm_client = OpenAI(
                api_key=api_key
            )
            md = MarkItDown(llm_client=llm_client, llm_model="gpt-4o-mini")
            result = md.convert(file_path)
            
            title, description = extract_title_and_summary(result.text_content)
            
            return FileInfo(
                title=title,
                description=description,
                content=result.text_content
            )