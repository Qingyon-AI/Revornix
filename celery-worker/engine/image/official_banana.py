from dotenv import load_dotenv
load_dotenv(override=True)

import re
from enums.engine import Engine, EngineCategory
from protocol.image_generate_engine import ImageGenerateEngineProtocol
from langfuse.openai import OpenAI
from langfuse import propagate_attributes

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


class OfficialBananaImageGenerateEngine(ImageGenerateEngineProtocol):
    
    def __init__(self):
        super().__init__(
            engine_uuid=Engine.Official_Banana_Image.meta.uuid,
            engine_name='Revornix Proxied Banana Image',
            engine_name_zh='Revornix 代理的 Banage 图像生成',
            engine_category=EngineCategory.IMAGE,
            engine_description='',
            engine_description_zh='',
            engine_demo_config=''
        )
        
    def generate_image(
        self, 
        text: str
    ) -> str | None:
        config = self.get_engine_config()
        if config is None:
            raise Exception("The engine havn't been initialized yet.")
        
        model_name = config.get('model_name')
        base_url = config.get('base_url')
        api_key = config.get('api_key')
        if model_name is None or base_url is None or api_key is None:
            raise Exception("The configuration of this engine is not complete.")
        
        if not self.user_id:
            raise Exception("The user_id is not set.")
        with propagate_attributes(
            user_id=str(self.user_id),
            tags=[f'model:{model_name}']
        ):
            llm_client = OpenAI(
                base_url=base_url,
                api_key=api_key
            )
            response = llm_client.chat.completions.create(
                model=model_name,
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
            if len(response.choices) > 0 and response.choices[0].message is not None and response.choices[0].message.content is not None:
                return response.choices[0].message.content
            return None