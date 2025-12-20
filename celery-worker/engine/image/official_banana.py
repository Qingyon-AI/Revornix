import re
import json
import crud
from common.jwt_utils import create_token
from common.dependencies import plan_ability_checked_in_func, check_deployed_by_official_in_fuc
from enums.ability import Ability
from data.sql.base import SessionLocal
from enums.engine import EngineUUID, EngineCategory
from protocol.image_generate_engine import ImageGenerateEngineProtocol
from openai import OpenAI
from official.engine.image import OFFICIAL_IMAGE_AI_BASE_URL, OFFICIAL_IMAGE_AI_KEY, OFFICIAL_IMAGE_AI_MODEL
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk

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
            engine_uuid=EngineUUID.Official_Banana_Image.value,
            engine_name='Revornix Proxied Banana Image',
            engine_name_zh='Revornix 代理的 Banage 图像生成',
            engine_category=EngineCategory.IMAGE,
            engine_description='',
            engine_description_zh='',
            engine_demo_config=''
        )

    # 官方代理的banana接口，初始化直接获取本地的环境变量即可
    async def init_engine_config_by_user_engine_id(
        self, 
        user_engine_id: int
    ):
        db = SessionLocal()
        try:
            user_engine = crud.engine.get_user_engine_by_user_engine_id(
                db=db,
                user_engine_id=user_engine_id
            )
            if not user_engine:
                raise ValueError("user_engine not found")

            user = crud.user.get_user_by_id(
                db=db,
                user_id=user_engine.user_id
            )
            if not user:
                raise ValueError("user not found")

            engine = crud.engine.get_engine_by_id(
                db=db,
                id=user_engine.engine_id
            )
            if not engine:
                raise ValueError("engine not found")

            if engine.uuid != self.engine_uuid:
                raise ValueError("engine uuid mismatch")

            ability_map = {
                EngineUUID.Official_OpenAI_TTS.value:
                    Ability.OFFICIAL_PROXIED_PODCAST_GENERATOR_LIMITED.value,
                EngineUUID.Official_Banana_Image.value:
                    Ability.OFFICIAL_PROXIED_IMAGE_GENERATOR_LIMITED.value,
            }

            ability = ability_map.get(engine.uuid)
            deployed_by_official = await check_deployed_by_official_in_fuc()
            if ability and deployed_by_official:
                access_token, _ = create_token(user=user)
                authorized = await plan_ability_checked_in_func(
                    ability=ability,
                    authorization=f"Bearer {access_token}"
                )
                if not authorized:
                    raise PermissionError("plan ability denied")
        finally:
            db.close()

        config = json.dumps({
            "model_name": OFFICIAL_IMAGE_AI_MODEL,
            "base_url": OFFICIAL_IMAGE_AI_BASE_URL,
            "api_key": OFFICIAL_IMAGE_AI_KEY
        })
        self.engine_config = config
        
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
            raise Exception("The user's configuration of this engine is not complete.")
        
        llm_client = OpenAI(
            base_url=base_url,
            api_key=api_key
        )
        response = llm_client.chat.completions.create(
            model=model_name,
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
                    return chunk.choices[0].delta.content

        return None