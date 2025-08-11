from langchain_core.language_models import BaseChatModel
from langchain_core.callbacks import (
    CallbackManagerForLLMRun,
)
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
)
from langchain_core.messages.ai import UsageMetadata
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from pydantic import Field
import openai


class OpenAICompatibleChatWrapper(BaseChatModel):
    """Custom wrapper for your model"""
    
    model_name: str = Field(...)
    api_key: str = Field(...)
    base_url: str = Field(...)
    
    def __init__(self, **data):
        super().__init__(**data)
        openai.api_key = self.api_key
        openai.api_base = self.base_url.rstrip('/')
        
    def _build_messages(self, messages: list[BaseMessage]):
        openai_msgs = []
        for m in messages:
            role = getattr(m, "role", None)
            if not role:
                from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
                if isinstance(m, SystemMessage):
                    role = "system"
                elif isinstance(m, HumanMessage):
                    role = "user"
                elif isinstance(m, AIMessage):
                    role = "assistant"
                else:
                    role = "user"
            openai_msgs.append({"role": role, "content": m.content})
        return openai_msgs

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        response = openai.chat.completions.create(
            model=self.model_name,
            messages=self._build_messages(messages),
            stop=stop,
            **kwargs,
        )
        text = response.choices[0].message.content
        ct_input_tokens = response.usage.prompt_tokens
        ct_output_tokens = response.usage.completion_tokens
        if run_manager:
                run_manager.on_llm_new_token(text)
        if stop:
            for s in stop:
                if s in text:
                    text = text.split(s)[0]
        message = AIMessage(
            content=text,
            response_metadata={
                "model_name": self.model_name,
            },
            usage_metadata=UsageMetadata(
                input_tokens=ct_input_tokens,
                output_tokens=ct_output_tokens,
                total_tokens=ct_input_tokens + ct_output_tokens,
            )
        )
        generation = ChatGeneration(message=message)
        return ChatResult(generations=[generation])
    
    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        response = openai.chat.completions.create(
            model=self.model_name,
            messages=self._build_messages(messages),
            stop=stop,
            stream=True,
            **kwargs,
        )
        sent_any = False  # 标记是否已经产出过chunk
        for token in response:
            if token.choices[0].finish_reason == "stop":
                break
            tokens = token.choices[0].delta.content
            if tokens is None:
                # 这里可以选择忽略或者发一个空chunk，防止无chunk情况
                continue
            sent_any = True
            chunk = ChatGenerationChunk(
                message=AIMessageChunk(
                    content=tokens,
                    response_metadata={"model_name": self.model_name},
                )
            )
            if run_manager:
                run_manager.on_llm_new_token(token, chunk=chunk)
            yield chunk
        if not sent_any:
            # 如果流里没有任何有效content，可以发一个空chunk避免报错
            chunk = ChatGenerationChunk(
                message=AIMessageChunk(
                    content="",
                    response_metadata={"model_name": self.model_name},
                )
            )
            if run_manager:
                run_manager.on_llm_new_token(None, chunk=chunk)
            yield chunk
    
    def bind_tools(self, tools, *, tool_choice = None, **kwargs):
        from langchain_core.utils.function_calling import convert_to_openai_tool
        formatted_tools = [
            convert_to_openai_tool(tool) for tool in tools
        ]
        return super().bind(tools=formatted_tools, **kwargs)

    @property
    def _llm_type(self) -> str:
        return "openai_compatible"
    
    @property
    def _identifying_params(self) -> dict[str, any]:
        return {
            "model_name": self.model_name,
        }
