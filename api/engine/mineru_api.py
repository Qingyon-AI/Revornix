# !!! There is no need for compeletion of this file as it is only for data reference !!!

from protocol.engine import EngineProtocol, EngineUUID

class MineruApiEngine(EngineProtocol):

    def __init__(self):
        super().__init__(engine_uuid=EngineUUID.MinerU_API.value,
                         engine_name='MinerU API',
                         engine_name_zh='MinerU API',
                         engine_description='MinerU API is an AI-driven file parser provided by MinerU official, which can parse files such as webpages, PDFs, and images into Markdown format while retaining the original layout well.',
                         engine_description_zh='MinerU API 是 MinerU官方提供的AI驱动的文件解析器，可以将网页、PDF、图片等文件解析为 Markdown 格式并且较好地保留原来的排版。')