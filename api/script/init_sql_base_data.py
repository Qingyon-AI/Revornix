from dotenv import load_dotenv
load_dotenv(override=True)

import crud
import models
from datetime import datetime
from alembic import command
from alembic.config import Config
from common.sql import SessionLocal
from config.base import BASE_DIR
from engine.jina import JinaEngine
from engine.markitdown import MarkitdownEngine
from engine.mineru import MineruEngine
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService

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
            mineru_engine = MineruEngine()
            jina_engine = JinaEngine()
            markitdown_engine = MarkitdownEngine()
            db_engine_mineru = crud.engine.create_engine(db=db,
                                                         uuid=mineru_engine.engine_uuid,
                                                         name=mineru_engine.engine_name,
                                                         name_zh=mineru_engine.engine_name_zh,
                                                         description=mineru_engine.engine_description,
                                                         description_zh=mineru_engine.engine_description_zh,
                                                         demo_config=mineru_engine.engine_demo_config)
            db_engine_jina = crud.engine.create_engine(db=db,
                                                       uuid=jina_engine.engine_uuid,
                                                       name=jina_engine.engine_name,
                                                       name_zh=jina_engine.engine_name_zh,
                                                       description=jina_engine.engine_description,
                                                       description_zh=jina_engine.engine_description_zh,
                                                       demo_config=jina_engine.engine_demo_config)
            db_engine_markitdown = crud.engine.create_engine(db=db,
                                                             uuid=markitdown_engine.engine_uuid,
                                                             name=markitdown_engine.engine_name,
                                                             name_zh=markitdown_engine.engine_name_zh,
                                                             description=markitdown_engine.engine_description,
                                                             description_zh=markitdown_engine.engine_description_zh,
                                                             demo_config=markitdown_engine.engine_demo_config)
            aliyun_oss_remote_file_service = AliyunOSSRemoteFileService()
            built_in_remote_file_service = BuiltInRemoteFileService()
            db_aliyun_oss_remote_file_service = crud.file_system.create_file_system(db=db,
                                                                                    uuid=aliyun_oss_remote_file_service.file_service_uuid,
                                                                                    name=aliyun_oss_remote_file_service.file_service_name,
                                                                                    name_zh=aliyun_oss_remote_file_service.file_service_name_zh,
                                                                                    description=aliyun_oss_remote_file_service.file_service_description,
                                                                                    description_zh=aliyun_oss_remote_file_service.file_service_description_zh)
            db_built_in_remote_file_service = crud.file_system.create_file_system(db=db,
                                                                                  uuid=built_in_remote_file_service.file_service_uuid,
                                                                                  name=built_in_remote_file_service.file_service_name,
                                                                                  name_zh=built_in_remote_file_service.file_service_name_zh,
                                                                                  description=built_in_remote_file_service.file_service_description,
                                                                                  description_zh=built_in_remote_file_service.file_service_description_zh)
            db.commit()
        except Exception as e:
            print(f"数据库初始化失败: {e}")
            command.downgrade(config=alembic_cfg, revision='head')
            db.rollback()