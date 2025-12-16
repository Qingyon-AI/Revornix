from dotenv import load_dotenv
load_dotenv(override=True)

import os
from openai import OpenAI

OFFICIAL_TTS_AI_BASE_URL = os.environ.get('OFFICIAL_TTS_AI_BASE_URL')
OFFICIAL_TTS_AI_KEY = os.environ.get('OFFICIAL_TTS_AI_KEY')
OFFICIAL_TTS_AI_MODEL = os.environ.get('OFFICIAL_TTS_AI_MODEL')

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
        voice: str = 'verse'
    ):
        if OFFICIAL_TTS_AI_MODEL is None:
            raise RuntimeError("Please set OFFICIAL_TTS_AI_MODEL in .env file")
        response = self.client.audio.speech.create(
            model=OFFICIAL_TTS_AI_MODEL,
            voice=voice,
            input=text,
            response_format='mp3'
        )
        return response

if __name__ == '__main__':
    client = OfficialTTSAIClient()
    generator_audio = client.generate(text='The quick brown fox jumped over the lazy dog.')
    audio_bytes = generator_audio.read()
    with open("output.mp3", "wb") as f:
        f.write(audio_bytes)
            