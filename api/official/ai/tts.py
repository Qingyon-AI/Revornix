from dotenv import load_dotenv
load_dotenv(override=True)

import os
from openai import OpenAI

OFFICIAL_TTS_AI_BASE_URL = os.environ.get('OFFICIAL_TTS_AI_BASE_URL')
OFFICIAL_TTS_AI_KEY = os.environ.get('OFFICIAL_TTS_AI_KEY')
OFFICIAL_TTS_AI_MODEL = os.environ.get('OFFICIAL_TTS_AI_MODEL')

if not OFFICIAL_TTS_AI_BASE_URL or not OFFICIAL_TTS_AI_KEY or not OFFICIAL_TTS_AI_MODEL:
    raise RuntimeError(
        "Please set OFFICIAL_TTS_AI_MODEL, "
        "OFFICIAL_TTS_AI_BASE_URL, "
        "OFFICIAL_TTS_AI_KEY in .env file"
    )

tts_client = OpenAI(
    base_url=OFFICIAL_TTS_AI_BASE_URL,
    api_key=OFFICIAL_TTS_AI_KEY
)

class OfficialTTSAIClient:
    client: OpenAI

    def __init__(self) -> None:
        llm_client = OpenAI(
            base_url=OFFICIAL_TTS_AI_BASE_URL,
            api_key=OFFICIAL_TTS_AI_KEY
        )
        self.client = llm_client
        
    def generate(
        self, 
        text: str,
        voice: str = 'alloy'
    ):
        assert OFFICIAL_TTS_AI_MODEL
        response = self.client.audio.speech.create(
            model=OFFICIAL_TTS_AI_MODEL,
            voice=voice,
            input=text,
            response_format='wav'
        )
        content = response.content.decode('utf-8')
        return content

if __name__ == '__main__':
    client = OfficialTTSAIClient()
    generator_audio = client.generate(text='The quick brown fox jumped over the lazy dog.')