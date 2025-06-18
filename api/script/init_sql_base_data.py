from dotenv import load_dotenv
load_dotenv(override=True)

from datetime import datetime
import crud
import models
from alembic import command
from alembic.config import Config
from common.sql import SessionLocal
from config.base import BASE_DIR

alembic_cfg_path = BASE_DIR / 'alembic.ini'

alembic_cfg = Config(str(alembic_cfg_path))

def is_data_initialized(db):
    """检查 attachment 表是否已经有默认数据"""
    result = db.query(models.attachment.Attachment).count()
    return result > 0  # 如果有记录，说明数据已经初始化

if __name__ == '__main__':
    command.revision(config=alembic_cfg, 
                     message=f'Initialize the sql database, {datetime.now()}',
                     autogenerate=True,
                     head='head')
    command.upgrade(config=alembic_cfg, 
                    revision='head')
    # 仅在数据库数据未初始化时，执行数据初始化
    db = SessionLocal()
    if not is_data_initialized(db):
        print("首次运行，初始化数据库数据...")
        try:
            db_attachment = crud.attachment.create_attachment(db=db,
                                                              name='images/default_avatar_1',
                                                              description='default avatar 1')
            db_engine_mineru = crud.engine.create_engine(db=db,
                                                         name='MinerU',
                                                         name_zh='MinerU',
                                                         description='Convert the website/file to markdown',
                                                         description_zh='转化网站/文件到markdown')
            db_engine_jina = crud.engine.create_engine(db=db,
                                                       name='Jina',
                                                       name_zh='Jina',
                                                       description='Convert the website to markdown',
                                                       description_zh='转化网站到markdown',
                                                       demo_config='{"api_key": "jina_******"}')
            db_engine_markitdown = crud.engine.create_engine(db=db,
                                                             name='MarkItDown',
                                                             name_zh='MarkItDown',
                                                             description='Convert the website/file to markdown',
                                                             description_zh='转化网站/文件到markdown',
                                                             demo_config='{"openai_api_key": "sk-proj-******"}')
            db.commit()
        except Exception as e:
            print(f"数据库初始化失败: {e}")
            command.downgrade(config=alembic_cfg, revision='head')
            db.rollback()