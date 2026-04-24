import inspect

from base_implement.tts_engine_base import TTSEngineBase, TTSSynthesisResult
from langfuse import propagate_attributes

from langfuse.openai import AsyncOpenAI

from common.logger import exception_logger
from common.ai import (
    _get_user_ai_interaction_language,
    build_text_output_language_instruction,
)
from enums.engine_enums import EngineCategory, EngineProvided
from prompts.podcast_generation import podcast_generation_prompt


async def _safe_close_async_client(client: AsyncOpenAI) -> None:
    close_fn = getattr(client, "close", None)
    if callable(close_fn):
        try:
            result = close_fn()
            if inspect.isawaitable(result):
                await result
        except RuntimeError as e:
            if "Event loop is closed" not in str(e):
                exception_logger.warning(f"Failed to close async llm client: {e}")
        except Exception as e:
            exception_logger.warning(f"Failed to close async llm client: {e}")
        return

    aclose_fn = getattr(client, "aclose", None)
    if callable(aclose_fn):
        try:
            result = aclose_fn()
            if inspect.isawaitable(result):
                await result
        except RuntimeError as e:
            if "Event loop is closed" not in str(e):
                exception_logger.warning(f"Failed to aclose async llm client: {e}")
        except Exception as e:
            exception_logger.warning(f"Failed to aclose async llm client: {e}")


class OpenAIAudioEngine(TTSEngineBase):
    """此引擎使用的是openai的tts接口
    """
    
    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.OpenAI_TTS.meta.uuid,
            engine_name="OpenAI Audio Engine",
            engine_name_zh="OpenAI Audio引擎",
            engine_category=EngineCategory.TTS,
            engine_description="OpenAI Audio engine, based on openai's audio interface, convert text to audio",
            engine_description_zh="OpenAI Audio引擎，基于openai提供的Audio接口，将文本转化为音频。"
        )
        
    async def synthesize(
        self, 
        text: str
    ) -> TTSSynthesisResult:
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
            language_instruction = build_text_output_language_instruction(
                await _get_user_ai_interaction_language(self.user_id),
            )
            llm_client = AsyncOpenAI(
                base_url=base_url,
                api_key=api_key
            )
            try:
                completion = await llm_client.chat.completions.create(
                    model=model_name,
                    modalities=["text", "audio"],
                    audio={"voice": "alloy", "format": "mp3"},
                    messages=[
                        {
                            "role": "system",
                            "content": language_instruction,
                        },
                        {
                            "role": "user",
                            "content": f'{podcast_generation_prompt(text)}'
                        }
                    ]
                )
                audio = completion.choices[0].message.audio
                if audio is None:
                    raise Exception("The audio is None.")
                script_text = completion.choices[0].message.content or text
                # Langfuse会将audio.data包装成LangfuseMedia，从中获取音频bytes需要通过_content_bytes
                return TTSSynthesisResult(
                    audio_bytes=audio.data._content_bytes,
                    script_text=script_text,
                )
            finally:
                await _safe_close_async_client(llm_client)
