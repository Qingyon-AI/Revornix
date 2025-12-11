from dotenv import load_dotenv
load_dotenv(override=True)

import os
import asyncio
from rich import print
from openai import OpenAI

API_BASE_URL = os.environ.get('OFFICIAL_AI_BASE_URL')
GPT_API_KEY = os.environ.get('OFFICIAL_GPT_KEY')
NANO_BANANA_KEY = os.environ.get('OFFICIAL_NANO_BANANA_KEY')

async def main():
    # 初始化 OpenAI 客户端
    openai = OpenAI(
        base_url=API_BASE_URL,
        api_key=GPT_API_KEY
    )

    # 调用 OpenAI API
    response = openai.completions.create(
        model="gpt-5.1",
        messages=[],
        # prompt="Hello, how are you?"
    )
    print(response)
    response_text = response.choices[0].text.strip()
    print(response_text)

if __name__ == '__main__':
    asyncio.run(main())