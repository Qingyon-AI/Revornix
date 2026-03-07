import re
from langfuse import propagate_attributes
from langfuse.openai import OpenAI

from common.usage_billing import persist_engine_usage_from_completion
from base_implement.image_understand_engine_base import ImageUnderstandEngineBase
from enums.engine_enums import EngineProvided, EngineCategory


SYSTEM_PROMPT = """You are a pure image understanding function.

Return ONLY a complete and detailed plain-text description of the image.

Rules:
- The description must be complete and informative
- Use a single paragraph only
- Do not use bullet points
- Do not use markdown
- Do not include line breaks
- Do not wrap the answer in quotes
- Keep important visual details, objects, layout, colors, actions, and scene relationships
"""

class KimiImageUnderstandEngine(ImageUnderstandEngineBase):

    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.Kimi_Image_Understand.meta.uuid,
            engine_name='Kimi Image Understand',
            engine_name_zh='Kimi 图像理解',
            engine_category=EngineCategory.IMAGE_UNDERSTAND,
            engine_description='Based on Kimi Image Understand Engine',
            engine_description_zh='基于Kimi的图像理解引擎',
            engine_demo_config='{"api_key": "", "base_url": "", "model_name": ""}'
        )
    
    def _normalize_for_markdown_description(self, text: str, max_length: int = 1000) -> str:
        if not text:
            return ""

        # 去首尾空白
        text = text.strip()

        # 多个空白/换行压成一个空格，变成单段
        text = re.sub(r"\s+", " ", text)

        # 替换可能破坏 markdown 语法的字符
        text = text.replace("[", "［").replace("]", "］")
        text = text.replace("(", "（").replace(")", "）")

        # 去掉可能干扰的反引号
        text = text.replace("`", "")

        # 去掉首尾引号
        text = text.strip('\'"“”‘’')

        # 长度限制放宽，防止无限长
        if len(text) > max_length:
            text = text[: max_length - 1].rstrip() + "…"

        return text

    def understand_image(
        self,
        image: str,
    ) -> str | None:
        config = self.get_engine_config()
        if config is None:
            raise Exception("The engine havn't been initialized yet.")

        model_name = config.get('model_name')
        base_url = config.get('base_url')
        api_key = config.get('api_key')
        if model_name is None or base_url is None or api_key is None:
            raise Exception(f"The configuration of this engine is not complete")

        if self.user_id is None:
            raise Exception("The user_id is not set.")

        image_url = image.strip()
        if not image_url:
            return None
        if image_url.startswith("![") and image_url.endswith(")"):
            left = image_url.find("(")
            right = image_url.rfind(")")
            if left != -1 and right > left + 1:
                image_url = image_url[left + 1:right].strip()
        if not image_url:
            return None

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
                messages=[
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image,
                                },
                            },
                            {
                                "type": "text",
                                "text": "Please provide a complete and detailed single-paragraph description of this image for embedding inside markdown brackets.",
                            },
                        ],
                    },
                ]
            )
            persist_engine_usage_from_completion(
                user_id=self.user_id,
                resource_uuid=self.resource_uuid or self.engine_uuid,
                completion=response,
                source="kimi_image_understand",
            )
            if len(response.choices) > 0 and response.choices[0].message is not None:
                content = response.choices[0].message.content
                if isinstance(content, str):
                    return self._normalize_for_markdown_description(content)
                if isinstance(content, list):
                    text_parts: list[str] = []
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str):
                            text_parts.append(part["text"])
                    if text_parts:
                        return self._normalize_for_markdown_description(" ".join(text_parts))
            return None

# if __name__ == '__main__':
#     import base64
#     from rich import print
#     from pathlib import Path
#     engine = KimiImageUnderstandEngine()
#     current_dir = Path(__file__).parent
#     with open(current_dir / './test.PNG', 'rb') as f:
#         img_bytes = f.read()
#         img_base64 = base64.b64encode(img_bytes).decode()
#         data_url = f"data:image/png;base64,{img_base64}"
#     print(engine.understand_image(data_url))