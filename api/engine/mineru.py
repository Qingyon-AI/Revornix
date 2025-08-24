# !!! There is no need for compeletion of this file as it is only for data reference !!!

from protocol.engine import EngineProtocol, EngineUUID

class MineruEngine(EngineProtocol):

    def __init__(self):
        super().__init__(engine_uuid=EngineUUID.MinerU.value,
                         engine_name='MinerU',
                         engine_name_zh='MinerU',
                         engine_description='MinerU is an AI-driven file parser that can parse web pages, PDFs, images, etc. into Markdown format and retain the original layout well.',
                         engine_description_zh='MinerU 是 AI驱动的文件解析器，可以将网页、PDF、图片等文件解析为 Markdown 格式并且较好地保留原来的排版。')