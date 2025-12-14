from dotenv import load_dotenv
load_dotenv(override=True)

import os
import re
from rich import print
from openai import OpenAI
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk

OFFICIAL_IMAGE_AI_BASE_URL = os.environ.get("OFFICIAL_IMAGE_AI_BASE_URL")
OFFICIAL_IMAGE_AI_KEY = os.environ.get("OFFICIAL_IMAGE_AI_KEY")
OFFICIAL_IMAGE_AI_MODEL = os.environ.get("OFFICIAL_IMAGE_AI_MODEL")

if not OFFICIAL_IMAGE_AI_BASE_URL or not OFFICIAL_IMAGE_AI_KEY or not OFFICIAL_IMAGE_AI_MODEL:
    raise RuntimeError(
        "Please set OFFICIAL_IMAGE_AI_MODEL, "
        "OFFICIAL_IMAGE_AI_BASE_URL, "
        "OFFICIAL_IMAGE_AI_KEY in .env file"
    )

SYSTEM_PROMPT = """You are a pure image generation function.

You MUST return ONLY a valid image Data URL in the exact format:

![image](data:<MIME-Type>;base64,<BASE64_DATA>)

Strict rules:
- Output MUST start with "data:"
- Output MUST contain exactly ONE comma ","
- Output MUST be a single-line string
- Output MUST NOT contain explanations, markdown, code blocks, or whitespace
- Output MUST NOT contain newlines
- Output MUST be directly machine-readable

If you cannot generate the image, return NOTHING.
"""

MARKDOWN_IMAGE_DATA_URL_PATTERN = re.compile(
    r"""^
    !\[image\]                           # ![image]
    \(                                   # (
    data:image\/(png|jpeg|jpg|webp)      # image MIME
    ;base64,                             # base64 separator
    [A-Za-z0-9+/=]+                      # base64 payload
    \)                                   # )
    $""",
    re.VERBOSE
)

class OfficialImageAIClient:
    client: OpenAI

    def __init__(self) -> None:
        llm_client = OpenAI(
            base_url=OFFICIAL_IMAGE_AI_BASE_URL,
            api_key=OFFICIAL_IMAGE_AI_KEY
        )
        self.client = llm_client
        
    def generate(
        self, 
        text: str
    ):
        assert OFFICIAL_IMAGE_AI_MODEL
        response = self.client.chat.completions.create(
            model=OFFICIAL_IMAGE_AI_MODEL,
            stream=True,
            temperature=0.2,  # 降低发散
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user", 
                    "content": text
                },   
            ]
        )
        for chunk in response:
            if isinstance(chunk, ChatCompletionChunk):
                # 实际的图片chunk
                if len(chunk.choices) > 0 and chunk.choices[0].delta is not None and chunk.choices[0].delta.content is not None:
                    return chunk
                # usage chunk
                elif chunk.usage is not None:
                    print(chunk.usage)

if __name__ == "__main__":
    client = OfficialImageAIClient()
    client.generate("A realistic black cat sitting on a wooden desk, soft lighting")