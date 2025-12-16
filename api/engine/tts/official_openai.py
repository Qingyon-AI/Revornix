import json
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