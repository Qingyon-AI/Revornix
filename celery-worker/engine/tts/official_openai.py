import json
import crud
from data.sql.base import SessionLocal
from enums.ability import Ability
from common.dependencies import plan_ability_checked_in_func, check_deployed_by_official_in_fuc
from common.jwt_utils import create_token
from protocol.tts_engine import TTSEngineProtocol
from enums.engine import EngineUUID, EngineCategory
from openai import OpenAI
from official.engine.tts import OFFICIAL_TTS_AI_BASE_URL, OFFICIAL_TTS_AI_KEY, OFFICIAL_TTS_AI_MODEL

class OfficialOpenAITTSEngine(TTSEngineProtocol):
    """此引擎使用的是Revornix代理的openai的tts接口
    """
    
    def __init__(self):
        super().__init__(
            engine_uuid=EngineUUID.Official_OpenAI_TTS.value,
            engine_name="Revornix Proxied OpenAI TTS Engine",
            engine_name_zh="Revornix代理的OpenAI TTS引擎",
            engine_category=EngineCategory.TTS,
            engine_description="Revornix proxied OpenAI TTS engine, based on openai's tts interface, convert text to audio",
            engine_description_zh="Revornix代理的OpenAI TTS引擎，基于openai提供的tts接口，将文本转化为音频。",
            engine_demo_config=''
        )
    
    # 官方代理的openai的tts接口，初始化直接获取本地的环境变量即可
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
            "model_name": OFFICIAL_TTS_AI_MODEL,
            "base_url": OFFICIAL_TTS_AI_BASE_URL,
            "api_key": OFFICIAL_TTS_AI_KEY
        })
        self.engine_config = config
        
    async def synthesize(
        self, 
        text: str
    ):
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
        
        response = llm_client.audio.speech.create(
            model=model_name,
            voice='verse',
            input=text,
            response_format='mp3'
        )
        return response.read()