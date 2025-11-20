from dotenv import load_dotenv
load_dotenv(override=True)

import crud
import models
from datetime import datetime
from alembic import command
from alembic.config import Config
from common.sql import SessionLocal
from config.base import BASE_DIR
from engine.markdown.jina import JinaEngine
from engine.markdown.markitdown import MarkitdownEngine
from engine.markdown.mineru import MineruEngine
from engine.markdown.mineru_api import MineruApiEngine
from engine.tts.volc.tts import VolcTTSEngine
from enums.engine import EngineCategory
from common.logger import info_logger, exception_logger
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.generic_s3_remote_file_service import GenericS3RemoteFileService
from notifcation.source.apple_notification_source import AppleNotificationSource
from notifcation.source.apple_sandbox_notification_source import AppleSandBoxNotificationSource
from notifcation.source.email_notification_source import EmailNotificationSource
from notifcation.target.apple_notification_target import AppleNotificationTarget
from notifcation.target.apple_sandbox_notification_target import AppleSandBoxNotificationTarget
from notifcation.target.email_notification_target import EmailNotificationTarget

alembic_cfg_path = BASE_DIR / 'alembic.ini'

alembic_cfg = Config(str(alembic_cfg_path))

def is_data_initialized(db):
    result = db.query(models.engine.Engine).count()
    return result > 0  # 如果有记录，说明数据已经初始化

if __name__ == '__main__':
    command.revision(
        config=alembic_cfg, 
        message=f'Initialize the sql database, {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
        autogenerate=True,
        head='head'
    )
    command.upgrade(
        config=alembic_cfg, 
        revision='head'
    )
    # 仅在数据库数据未初始化时，执行数据初始化
    db = SessionLocal()
    if not is_data_initialized(db):
        info_logger.info("Initialize the database data...")
        try:
            db_email_notification_source = crud.notification.create_notification_source(
                db=db,
                uuid=EmailNotificationSource.uuid,
                name=EmailNotificationSource.name,
                name_zh=EmailNotificationSource.name_zh,
                description=EmailNotificationSource.description,
                description_zh=EmailNotificationSource.description_zh,
                demo_config=EmailNotificationSource.demo_config
            )
            db_email_notification_target = crud.notification.create_notification_target(
                db=db,
                uuid=EmailNotificationTarget.uuid,
                name=EmailNotificationTarget.name,
                name_zh=EmailNotificationTarget.name_zh,
                description=EmailNotificationTarget.description,
                description_zh=EmailNotificationTarget.description_zh,
                demo_config=EmailNotificationTarget.demo_config
            )
            db_apple_notification_source = crud.notification.create_notification_source(
                db=db,
                uuid=AppleNotificationSource.uuid,
                name=AppleNotificationSource.name,
                name_zh=AppleNotificationSource.name_zh,
                description=AppleNotificationSource.description,
                description_zh=AppleNotificationSource.description_zh,
                demo_config=AppleNotificationSource.demo_config
            )
            db_apple_notification_target = crud.notification.create_notification_target(
                db=db,
                uuid=AppleNotificationTarget.uuid,
                name=AppleNotificationTarget.name,
                name_zh=AppleNotificationTarget.name_zh,
                description=AppleNotificationTarget.description,
                description_zh=AppleNotificationTarget.description_zh,
                demo_config=AppleNotificationTarget.demo_config
            )
            db_apple_sand_box_notification_source = crud.notification.create_notification_source(
                db=db,
                uuid=AppleSandBoxNotificationSource.uuid,
                name=AppleSandBoxNotificationSource.name,
                name_zh=AppleSandBoxNotificationSource.name_zh,
                description=AppleSandBoxNotificationSource.description,
                description_zh=AppleSandBoxNotificationSource.description_zh,
                demo_config=AppleSandBoxNotificationSource.demo_config
            )
            db_apple_sand_box_notification_target = crud.notification.create_notification_target(
                db=db,
                uuid=AppleSandBoxNotificationTarget.uuid,
                name=AppleSandBoxNotificationTarget.name,
                name_zh=AppleSandBoxNotificationTarget.name_zh,
                description=AppleSandBoxNotificationTarget.description,
                description_zh=AppleSandBoxNotificationTarget.description_zh,
                demo_config=AppleSandBoxNotificationTarget.demo_config
            )
            mineru_engine = MineruEngine()
            jina_engine = JinaEngine()
            markitdown_engine = MarkitdownEngine()
            mineru_api_engine = MineruApiEngine()
            volc_tts_engine = VolcTTSEngine()
            db_engine_mineru = crud.engine.create_engine(
                db=db,
                category=EngineCategory.Markdown,
                uuid=mineru_engine.engine_uuid,
                name=mineru_engine.engine_name,
                name_zh=mineru_engine.engine_name_zh,
                description=mineru_engine.engine_description,
                description_zh=mineru_engine.engine_description_zh,
                demo_config=mineru_engine.engine_demo_config
            )
            db_engine_jina = crud.engine.create_engine(
                db=db,
                category=EngineCategory.Markdown,
                uuid=jina_engine.engine_uuid,
                name=jina_engine.engine_name,
                name_zh=jina_engine.engine_name_zh,
                description=jina_engine.engine_description,
                description_zh=jina_engine.engine_description_zh,
                demo_config=jina_engine.engine_demo_config
            )
            db_engine_markitdown = crud.engine.create_engine(
                db=db,
                category=EngineCategory.Markdown,
                uuid=markitdown_engine.engine_uuid,
                name=markitdown_engine.engine_name,
                name_zh=markitdown_engine.engine_name_zh,
                description=markitdown_engine.engine_description,
                description_zh=markitdown_engine.engine_description_zh,
                demo_config=markitdown_engine.engine_demo_config
            )
            db_engine_mineru_api = crud.engine.create_engine(
                db=db,
                category=EngineCategory.Markdown,
                uuid=mineru_api_engine.engine_uuid,
                name=mineru_api_engine.engine_name,
                name_zh=mineru_api_engine.engine_name_zh,
                description=mineru_api_engine.engine_description,
                description_zh=mineru_api_engine.engine_description_zh,
                demo_config=mineru_api_engine.engine_demo_config
            )
            db_engine_volc_tts = crud.engine.create_engine(
                db=db,
                category=EngineCategory.TTS,
                uuid=volc_tts_engine.engine_uuid,
                name=volc_tts_engine.engine_name,
                name_zh=volc_tts_engine.engine_name_zh,
                description=volc_tts_engine.engine_description_zh,
                description_zh=volc_tts_engine.engine_description_zh,
                demo_config=volc_tts_engine.engine_demo_config
            )
            built_in_remote_file_service = BuiltInRemoteFileService()
            aliyun_oss_remote_file_service = AliyunOSSRemoteFileService()
            aws_s3_remote_file_service = AWSS3RemoteFileService()
            generic_s3_remote_file_service = GenericS3RemoteFileService()
            db_built_in_remote_file_service = crud.file_system.create_file_system(
                db=db,
                uuid=built_in_remote_file_service.file_service_uuid,
                name=built_in_remote_file_service.file_service_name,
                name_zh=built_in_remote_file_service.file_service_name_zh,
                description=built_in_remote_file_service.file_service_description,
                description_zh=built_in_remote_file_service.file_service_description_zh,
                demo_config=built_in_remote_file_service.file_service_demo_config
            )
            db_aliyun_oss_remote_file_service = crud.file_system.create_file_system(
                db=db,
                uuid=aliyun_oss_remote_file_service.file_service_uuid,
                name=aliyun_oss_remote_file_service.file_service_name,
                name_zh=aliyun_oss_remote_file_service.file_service_name_zh,
                description=aliyun_oss_remote_file_service.file_service_description,
                description_zh=aliyun_oss_remote_file_service.file_service_description_zh,
                demo_config=aliyun_oss_remote_file_service.file_service_demo_config
            )
            db_aws_s3_remote_file_service = crud.file_system.create_file_system(
                db=db,
                uuid=aws_s3_remote_file_service.file_service_uuid,
                name=aws_s3_remote_file_service.file_service_name,
                name_zh=aws_s3_remote_file_service.file_service_name_zh,
                description=aws_s3_remote_file_service.file_service_description,
                description_zh=aws_s3_remote_file_service.file_service_description_zh,
                demo_config=aws_s3_remote_file_service.file_service_demo_config
            )
            db_generic_s3_remote_file_service = crud.file_system.create_file_system(
                db=db,
                uuid=generic_s3_remote_file_service.file_service_uuid,
                name=generic_s3_remote_file_service.file_service_name,
                name_zh=generic_s3_remote_file_service.file_service_name_zh,
                description=generic_s3_remote_file_service.file_service_description,
                description_zh=generic_s3_remote_file_service.file_service_description_zh,
                demo_config=generic_s3_remote_file_service.file_service_demo_config
            )
            db.commit()
        except Exception as e:
            exception_logger.error(f"Initialize the sql database failed: {e}")
            command.downgrade(
                config=alembic_cfg, 
                revision='head'
            )
            db.rollback()
        finally:
            db.close()
            