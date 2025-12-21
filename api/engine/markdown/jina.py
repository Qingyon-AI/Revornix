import httpx
from protocol.markdown_engine import MarkdownEngineProtocol, WebsiteInfo
from enums.engine import Engine, EngineCategory

class JinaEngine(MarkdownEngineProtocol):
    
    def __init__(self):
        super().__init__(
            engine_uuid=Engine.Jina.meta.uuid,
            engine_name='Jina',
            engine_name_zh='Jina',
            engine_category=EngineCategory.Markdown,
            engine_description='Jina is an AI-powered web scraping engine that can help you quickly find the information you want.',
            engine_description_zh='Jina 是一个的 AI 驱动的网页抓取引擎，它可以帮助你快速地找到你想要的信息。',
            engine_demo_config='{"api_key": "jina_******"}'
        )

    async def analyse_website(
        self, 
        url: str
    ):
        engine_config = self.get_engine_config()
        if engine_config is None:
            raise Exception('Please init engine config first, or check the user engine config.')
        jina_api_key = engine_config.get("api_key")
        if jina_api_key is None:
            raise Exception('Please set jina api key in engine config.')
        headers = {
            'Accept': 'application/json',
            'Authorization': f'Bearer {jina_api_key}'
        }
        # as jina ai sometimes do take a lot of times to response, so we set a timeout
        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            response = await client.get(f'https://r.jina.ai/{url}', headers=headers)
            title = response.json().get('data').get('title')
            description = response.json().get('data').get('description')
            content = response.json().get('data').get('content')
            cover = await self.get_website_cover_by_playwright(url=url)
            return WebsiteInfo(
                url=url,
                title=title,
                description=description,
                content=content,
                cover=cover
            )