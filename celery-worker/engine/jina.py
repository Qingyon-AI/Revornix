import httpx
from protocol.engine import EngineProtocol, WebsiteInfo

class JinaEngine(EngineProtocol):
    
    async def analyse_website(self, url: str):  
        headers = {
            'Accept': 'application/json',
            'Authorization': f'Bearer {self.get_engine_config().get("api_key")}'
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
            
if __name__ == '__main__':
    import asyncio
    engine = JinaEngine(engin_config='{"api_key": "jina_******"}')
    result = asyncio.run(engine.analyse_website('https://www.baidu.com'))
    print(result)