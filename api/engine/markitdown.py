import io
from protocol.engine import EngineProtocol, WebsiteInfo, AsyncChromiumLoader, FileInfo
from common.common import extract_title_and_summary
from bs4 import BeautifulSoup
from markitdown import MarkItDown
from openai import OpenAI

class MarkitdownEngine(EngineProtocol):
    
    def __init__(self, engine_name = None, engine_version = None, engine_description = None, engin_config = None):
        super().__init__(engine_name, engine_version, engine_description, engin_config)
        llm_client = OpenAI(api_key=self.get_engine_config().get("openai_api_key"))
        self.llm_client = llm_client
    
    async def analyse_website(self, url: str):  
        loader_headless = AsyncChromiumLoader([url], user_agent="MyAppUserAgent")
        docs = await loader_headless.aload()
        html_content = docs[0].page_content
        md = MarkItDown(llm_client=self.llm_client, llm_model="gpt-4o-mini")
        stream = io.BytesIO(html_content.encode('utf-8'))
        content = md.convert_stream(stream).text_content
        soup = BeautifulSoup(html_content, 'html.parser')
        og_title_meta = soup.find('meta', property='og:title')
        og_description_meta = soup.find('meta', property='og:description')
        normal_title = soup.title.string
        normal_description = soup.find('meta', attrs={'name': 'description'})
        title = og_title_meta.attrs['content'] if og_title_meta is not None else normal_title if normal_title is not None else None
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
        
    async def analyse_file(self, file_path: str) -> FileInfo:
        md = MarkItDown(llm_client=self.llm_client, llm_model="gpt-4o-mini")
        result = md.convert(file_path)
        
        title, description = extract_title_and_summary(result.text_content)
        
        return FileInfo(title=title,
                        description=description,
                        content=result.text_content)


if __name__ == '__main__':
    import asyncio
    engine = MarkitdownEngine(engin_config='{"openai_api_key":"sk-***"}')
    # result = asyncio.run(
    #     engine.analyse_website('https://kinda.info/post/bd43b6d9-e9dc-45ef-bc0e-c21fc6ce8b7d')
    # )
    result = asyncio.run(
        engine.analyse_file('/Users/kinda/Desktop/Simulator Screenshot - iPhone 16 Pro Max - 2025-05-06 at 13.43.26.png')
    )
    print(result)
