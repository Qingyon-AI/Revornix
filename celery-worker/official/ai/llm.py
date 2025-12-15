from dotenv import load_dotenv
load_dotenv(override=True)

import os
from openai import OpenAI
from rich import print
from openai.types.responses.response_completed_event import ResponseCompletedEvent

OFFICIAL_LLM_AI_BASE_URL = os.environ.get('OFFICIAL_LLM_AI_BASE_URL')
OFFICIAL_LLM_AI_KEY = os.environ.get('OFFICIAL_LLM_AI_KEY')
OFFICIAL_LLM_AI_MODEL = os.environ.get('OFFICIAL_LLM_AI_MODEL')

class OfficialLLMAIClient:

    client: OpenAI
    
    def __init__(self) -> None:
        llm_client = OpenAI(
            base_url=OFFICIAL_LLM_AI_BASE_URL,
            api_key=OFFICIAL_LLM_AI_KEY
        )
        self.client = llm_client
        
    def generate(
        self, 
        text: str
    ):
        if OFFICIAL_LLM_AI_MODEL is None:
            raise RuntimeError("Please set OFFICIAL_LLM_AI_MODEL in .env file")
        response = self.client.responses.create(
            model=OFFICIAL_LLM_AI_MODEL,
            stream=True,
            input=[
                {
                    "role": "user", 
                    "content": text
                },   
            ]
        )
        for chunk in response:
            if isinstance(chunk, ResponseCompletedEvent):
                print(chunk.response.usage)
                return chunk

if __name__ == '__main__':
    client = OfficialLLMAIClient()
    print(client.generate("Hello, how are you?"))
