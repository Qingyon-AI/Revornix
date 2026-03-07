from base_implement.engine_base import EngineBase

class ImageUnderstandEngineBase(EngineBase):

    def understand_image(
        self,
        image: str,
    ) -> str | None:
        """用一个完整段落描述一张图片

        Args:
            image (str): 图片的Base64 URL 注意是URL而不是编码

        Returns:
            str | None: 一个完整的段落，不分段！
        """
        raise NotImplementedError("Method not implemented")