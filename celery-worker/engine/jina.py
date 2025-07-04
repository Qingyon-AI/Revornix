import httpx
from protocol.engine import EngineProtocol, WebsiteInfo

class JinaEngine(EngineProtocol):
    
    def __init__(self,
                 user_id: int | None = None):
        super().__init__(engine_uuid='e31849ffa7f84a2cb4e2fa2ea00f25d2',
                         engine_name='Jina',
                         engine_name_zh='Jina',
                         engine_description='Jina is an AI-powered web scraping engine that can help you quickly find the information you want.',
                         engine_description_zh='Jina 是一个的 AI 驱动的网页抓取引擎，它可以帮助你快速地找到你想要的信息。',
                         engine_demo_config='{"api_key": "jina_******"}',
                         user_id=user_id)
    
    async def analyse_website(self, url: str):  
        headers = {
            'Accept': 'application/json',
            'Authorization': f'Bearer {self.get_engine_config().get("apikey")}'
        }
        timeout = httpx.Timeout(10.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            response = await client.get(f'https://r.jina.ai/{url}', headers=headers)
            title = response.json().get('data').get('title')
            description = response.json().get('data').get('description')
            content = response.json().get('data').get('content')
            cover = await self.get_website_cover_by_playwright(url=url)
            return WebsiteInfo(
                title=title,
                description=description,
                content=content,
                cover=cover
            )