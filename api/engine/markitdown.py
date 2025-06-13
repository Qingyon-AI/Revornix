import io
from protocol.engine import EngineProtocol, WebsiteInfo, AsyncChromiumLoader
from bs4 import BeautifulSoup
from markitdown import MarkItDown

class MarkitdownEngine(EngineProtocol):
    
    async def analyse_website(self, url: str):  
        loader_headless = AsyncChromiumLoader([url], user_agent="MyAppUserAgent")
        docs = await loader_headless.aload()
        html_content = docs[0].page_content
        md = MarkItDown()
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
        return WebsiteInfo(
            url=url,
            title=title,
            description=description,
            content=content,
            cover=cover
        )