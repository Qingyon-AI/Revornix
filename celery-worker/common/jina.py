import httpx
import os

timeout = httpx.Timeout(10.0, connect=10.0)

def transform_website_to_markdown_by_jina(url: str):
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Bearer {os.environ.get('JINA_API_TOKEN')}'
    }
    response = httpx.get(f'https://r.jina.ai/{url}', headers=headers, timeout=timeout, verify=False)
    return response.json()