from dotenv import load_dotenv
load_dotenv(override=True)

import os
from langfuse.openai import OpenAI

OFFICIAL_VOLC_TTS_AI_BASE_URL = os.environ.get('OFFICIAL_VOLC_TTS_AI_BASE_URL')
OFFICIAL_VOLC_TTS_ACCESS_TOKEN = os.environ.get('OFFICIAL_VOLC_TTS_ACCESS_TOKEN')
OFFICIAL_VOLC_TTS_APP_ID = os.environ.get('OFFICIAL_VOLC_TTS_APP_ID')