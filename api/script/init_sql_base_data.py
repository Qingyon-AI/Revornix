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
from common.logger import info_logger, exception_logger
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.generic_s3_remote_file_service import GenericS3RemoteFileService
from notification.source.apple_notification_source import AppleNotificationSource
from notification.source.apple_sandbox_notification_source import AppleSandBoxNotificationSource
from notification.source.email_notification_source import EmailNotificationSource
from notification.source.feishu_notification_source import FeishuNotificationSource
from notification.source.dingtalk_notification_source import DingTalkNotificationSource
from notification.source.telegram_notification_source import TelegramNotificationSource
from notification.target.telegram_notification_target import TelegramNotificationTarget
from notification.target.dingtalk_notification_target import DingTalkNotificationTarget
from notification.target.feishu_notification_target import FeishuNotificationTarget
from notification.target.apple_notification_target import AppleNotificationTarget
from notification.target.apple_sandbox_notification_target import AppleSandBoxNotificationTarget
from notification.target.email_notification_target import EmailNotificationTarget
from notification.trigger_event.removed_from_section import RemovedFromSectionNotificationTriggerEvent
from notification.trigger_event.section_updated import SectionUpdatedNotificationTriggerEvent
from notification.trigger_event.section_commented import SectionCommentedNotificationTriggerEvent
from notification.trigger_event.section_subscribed import SectionSubscribedNotificationTriggerEvent
from protocol.notification_trigger import NotificationTriggerEventProtocol
from protocol.notification_source import NotificationSourceProtocol
from protocol.notification_target import NotificationTargetProtocol
from protocol.engine import EngineProtocol
from protocol.notification_template import NotificationTemplate
from protocol.remote_file_service import RemoteFileServiceProtocol
from notification.template.daily_summary import DailySummaryNotificationTemplate
from notification.template.section_updated import SectionUpdatedNotificationTemplate
from notification.template.section_commented import SectionCommentedNotificationTemplate
from notification.template.section_subscribed import SectionSubscribedNotificationTemplate
from notification.template.removed_from_section import RemovedFromSectionNotificationTemplate

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
    db = SessionLocal()
    try:
        section_commented_notification_template = SectionCommentedNotificationTemplate()
        section_updated_notification_template = SectionUpdatedNotificationTemplate()
        daily_summary_notification_template = DailySummaryNotificationTemplate()
        section_subscribed_notification_template = SectionSubscribedNotificationTemplate()
        removed_from_section_notification_template = RemovedFromSectionNotificationTemplate()
        notification_templates: list[NotificationTemplate] = [
            section_commented_notification_template,
            section_updated_notification_template,
            daily_summary_notification_template,
            section_subscribed_notification_template,
            removed_from_section_notification_template
        ]
        for notification_template in notification_templates:
            if crud.notification.get_notification_template_by_uuid(
                db=db, 
                uuid=notification_template.uuid
            ) is None:
                crud.notification.create_notification_template(
                    db=db,
                    uuid=notification_template.uuid,
                    name=notification_template.name,
                    name_zh=notification_template.name_zh,
                    description=notification_template.description,
                    description_zh=notification_template.description_zh,
                )
        removed_from_section_notification_trigger = RemovedFromSectionNotificationTriggerEvent()
        section_updated_notification_trigger = SectionUpdatedNotificationTriggerEvent()
        section_commented_notification_trigger = SectionCommentedNotificationTriggerEvent()
        section_subscribed_notification_trigger = SectionSubscribedNotificationTriggerEvent()
        triggers: list[NotificationTriggerEventProtocol] = [
            removed_from_section_notification_trigger,
            section_updated_notification_trigger,
            section_commented_notification_trigger,
            section_subscribed_notification_trigger
        ]
        for trigger in triggers:
            if crud.notification.get_trigger_event_by_uuid(
                db=db, 
                uuid=trigger.uuid
            ) is None:
                crud.notification.create_notification_trigger_event(
                    db=db,
                    uuid=trigger.uuid,
                    name=trigger.name,
                    name_zh=trigger.name_zh,
                    description=trigger.description,
                    description_zh=trigger.description_zh
                )
        email_notification_source = EmailNotificationSource()
        apple_notification_source = AppleNotificationSource()
        apple_sand_box_notification_source = AppleSandBoxNotificationSource()
        feishu_notification_source = FeishuNotificationSource()
        dingtalk_notification_source = DingTalkNotificationSource()
        telegram_notification_source = TelegramNotificationSource()
        notification_sources: list[NotificationSourceProtocol] = [
            email_notification_source,
            apple_notification_source,
            apple_sand_box_notification_source,
            feishu_notification_source,
            dingtalk_notification_source,
            telegram_notification_source
        ]
        for notification_source in notification_sources:
            if crud.notification.get_notification_source_by_uuid(
                db=db, 
                uuid=notification_source.uuid
            ) is None:
                crud.notification.create_notification_source(
                    db=db,
                    uuid=notification_source.uuid,
                    name=notification_source.name,
                    name_zh=notification_source.name_zh,
                    description=notification_source.description,
                    description_zh=notification_source.description_zh,
                    demo_config=notification_source.demo_config
                )
        email_notification_target = EmailNotificationTarget()
        apple_notification_target = AppleNotificationTarget()
        apple_sand_box_notification_target = AppleSandBoxNotificationTarget()
        feishu_notification_target = FeishuNotificationTarget()
        dingtalk_notification_target = DingTalkNotificationTarget()
        telegram_notification_target = TelegramNotificationTarget()
        notification_targets: list[NotificationTargetProtocol] = [
            email_notification_target,
            apple_notification_target,
            apple_sand_box_notification_target,
            feishu_notification_target,
            dingtalk_notification_target,
            telegram_notification_target
        ]
        for notification_target in notification_targets:
            if crud.notification.get_notification_target_by_uuid(
                db=db, 
                uuid=notification_target.uuid
            ) is None:
                crud.notification.create_notification_target(
                    db=db,
                    uuid=notification_target.uuid,
                    name=notification_target.name,
                    name_zh=notification_target.name_zh,
                    description=notification_target.description,
                    description_zh=notification_target.description_zh,
                    demo_config=notification_target.demo_config
                )
        mineru_engine = MineruEngine()
        jina_engine = JinaEngine()
        markitdown_engine = MarkitdownEngine()
        mineru_api_engine = MineruApiEngine()
        volc_tts_engine = VolcTTSEngine()
        engines: list[EngineProtocol] = [
            mineru_engine,
            jina_engine,
            markitdown_engine,
            mineru_api_engine,
            volc_tts_engine
        ]
        for engine in engines:
            if crud.engine.get_engine_by_uuid(
                db=db, 
                uuid=engine.engine_uuid
            ) is None:
                crud.engine.create_engine(
                    db=db,
                    category=engine.engine_category,
                    uuid=engine.engine_uuid,
                    name=engine.engine_name,
                    name_zh=engine.engine_name_zh,
                    description=engine.engine_description,
                    description_zh=engine.engine_description_zh,
                    demo_config=engine.engine_demo_config
                )
        built_in_remote_file_service = BuiltInRemoteFileService()
        aliyun_oss_remote_file_service = AliyunOSSRemoteFileService()
        aws_s3_remote_file_service = AWSS3RemoteFileService()
        generic_s3_remote_file_service = GenericS3RemoteFileService()
        remote_file_services: list[RemoteFileServiceProtocol] = [
            built_in_remote_file_service,
            aliyun_oss_remote_file_service,
            aws_s3_remote_file_service,
            generic_s3_remote_file_service
        ]
        for remote_file_service in remote_file_services:
            if crud.file_system.get_file_system_by_uuid(
                db=db, 
                uuid=remote_file_service.file_service_uuid
            ) is None:
                crud.file_system.create_file_system(
                    db=db,
                    uuid=remote_file_service.file_service_uuid,
                    name=remote_file_service.file_service_name,
                    name_zh=remote_file_service.file_service_name_zh,
                    description=remote_file_service.file_service_description,
                    description_zh=remote_file_service.file_service_description_zh,
                    demo_config=remote_file_service.file_service_demo_config
                )
        db.commit()
        info_logger.info("Initialize the sql database successfully")
    except Exception as e:
        exception_logger.error(f"Initialize the sql database failed: {e}")
    finally:
        db.close()