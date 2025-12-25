from protocol.tts_engine import TTSEngineProtocol
from enums.engine import Engine, EngineCategory
from langfuse.openai import OpenAI
from langfuse import propagate_attributes
from prompts.podcast_generation import podcast_generation_prompt

class OpenAIAudioEngine(TTSEngineProtocol):
    """此引擎使用的是openai的tts接口
    """
    
    def __init__(self):
        super().__init__(
            engine_uuid=Engine.OpenAI_TTS.meta.uuid,
            engine_name="OpenAI Audio Engine",
            engine_name_zh="OpenAI Audio引擎",
            engine_category=EngineCategory.TTS,
            engine_description="OpenAI Audio engine, based on openai's audio interface, convert text to audio",
            engine_description_zh="OpenAI Audio引擎，基于openai提供的Audio接口，将文本转化为音频。",
            engine_demo_config='{"base_url":"","api_key":"","model_name":""}'
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
            raise Exception("The user_id is not set.")
        
        with propagate_attributes(
            user_id=str(self.user_id),
            tags=[f'model:{model_name}']
        ):  
            llm_client = OpenAI(
                base_url=base_url,
                api_key=api_key
            )
            completion = llm_client.chat.completions.create(
                model=model_name,
                modalities=["text", "audio"],
                audio={"voice": "alloy", "format": "mp3"},
                messages=[
                    {
                        "role": "user",
                        "content": f'{podcast_generation_prompt(text)}'
                    }
                ]
            )
            audio = completion.choices[0].message.audio
            if audio is None:
                raise Exception("The audio is None.")
            # Langfuse会将audio.data包装成LangfuseMedia，从中获取音频bytes需要通过_content_bytes
            return audio.data._content_bytes

if __name__ == '__main__':
    async def main():
        engine = OpenAIAudioEngine()
        await engine.init_engine_config_by_user_engine_id(
            user_engine_id=3
        )
        res = await engine.synthesize('今天是个好天气。')
        with open('res.mp3', 'wb') as f:
            f.write(res)
    import asyncio
    asyncio.run(main())