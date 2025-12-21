from protocol.tts_engine import TTSEngineProtocol
from enums.engine import Engine, EngineCategory
from langfuse.openai import OpenAI
from langfuse import propagate_attributes

class OpenAITTSEngine(TTSEngineProtocol):
    """此引擎使用的是openai的tts接口
    """
    
    def __init__(self):
        super().__init__(
            engine_uuid=Engine.OpenAI_TTS.meta.uuid,
            engine_name="OpenAI TTS Engine",
            engine_name_zh="OpenAI TTS引擎",
            engine_category=EngineCategory.TTS,
            engine_description="OpenAI TTS engine, based on openai's tts interface, convert text to audio",
            engine_description_zh="OpenAI TTS引擎，基于openai提供的tts接口，将文本转化为音频。",
            engine_demo_config='{"base_url":"","api_key":"",model_name: ""}'
        )
        
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
        
        if not self.user_id:
            raise Exception("The user_id is not set. Please set the user_id first.")
        with propagate_attributes(user_id=str(self.user_id)):
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