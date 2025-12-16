from dotenv import load_dotenv
load_dotenv(override=True)

import os
from datetime import datetime

from sqlalchemy import text
from alembic import command
from alembic.config import Config

import crud
import models

from data.sql.base import SessionLocal, Base, engine
from config.base import BASE_DIR
from common.logger import info_logger, exception_logger

# ---------------- Engines ----------------
from engine.markdown.jina import JinaEngine
from engine.markdown.markitdown import MarkitdownEngine
from engine.markdown.mineru import MineruEngine
from engine.markdown.mineru_api import MineruApiEngine
from engine.tts.volc.tts import VolcTTSEngine
from engine.image.banana import BananaImageGenerateEngine
from engine.tts.openai import OpenAITTSEngine

# ---------------- File Systems ----------------
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.generic_s3_remote_file_service import GenericS3RemoteFileService

# ---------------- Notification ----------------
from notification.source.apple_notification_source import AppleNotificationSource
from notification.source.apple_sandbox_notification_source import AppleSandBoxNotificationSource
from notification.source.email_notification_source import EmailNotificationSource
from notification.source.feishu_notification_source import FeishuNotificationSource
from notification.source.dingtalk_notification_source import DingTalkNotificationSource
from notification.source.telegram_notification_source import TelegramNotificationSource

from notification.target.apple_notification_target import AppleNotificationTarget
from notification.target.apple_sandbox_notification_target import AppleSandBoxNotificationTarget
from notification.target.email_notification_target import EmailNotificationTarget
from notification.target.feishu_notification_target import FeishuNotificationTarget
from notification.target.dingtalk_notification_target import DingTalkNotificationTarget
from notification.target.telegram_notification_target import TelegramNotificationTarget

from notification.trigger_event.removed_from_section import RemovedFromSectionNotificationTriggerEvent
from notification.trigger_event.section_updated import SectionUpdatedNotificationTriggerEvent
from notification.trigger_event.section_commented import SectionCommentedNotificationTriggerEvent
from notification.trigger_event.section_subscribed import SectionSubscribedNotificationTriggerEvent

from notification.template.daily_summary import DailySummaryNotificationTemplate
from notification.template.section_updated import SectionUpdatedNotificationTemplate
from notification.template.section_commented import SectionCommentedNotificationTemplate
from notification.template.section_subscribed import SectionSubscribedNotificationTemplate
from notification.template.removed_from_section import RemovedFromSectionNotificationTemplate

from protocol.notification_template import NotificationTemplate
from protocol.notification_trigger import NotificationTriggerEventProtocol
from protocol.notification_source import NotificationSourceProtocol
from protocol.notification_target import NotificationTargetProtocol
from protocol.engine import EngineProtocol
from protocol.remote_file_service import RemoteFileServiceProtocol


# =========================================================
# 环境保护（防止误删生产）
# =========================================================

ENV = os.getenv("ENV", "development")
ALLOW_DB_RESET = os.getenv("ALLOW_DB_RESET", "0") == "1"

if ENV != "development" and not ALLOW_DB_RESET:
    raise RuntimeError(
        "❌ Refusing to reset database in non-development environment.\n"
        "Set ALLOW_DB_RESET=1 if you really want to do this."
    )


# =========================================================
# Alembic 配置
# =========================================================

alembic_cfg = Config(str(BASE_DIR / "alembic.ini"))


# =========================================================
# PostgreSQL：安全清库
# =========================================================

def drop_schema_postgres():
    info_logger.warning("⚠️ Dropping ALL tables via DROP SCHEMA public CASCADE...")
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        conn.commit()
    info_logger.warning("✅ Schema public recreated.")


# =========================================================
# Seed 数据
# =========================================================

def seed_database(db):
    # -------- Notification Templates --------
    templates: list[NotificationTemplate] = [
        SectionCommentedNotificationTemplate(),
        SectionUpdatedNotificationTemplate(),
        DailySummaryNotificationTemplate(),
        SectionSubscribedNotificationTemplate(),
        RemovedFromSectionNotificationTemplate(),
    ]

    for tpl in templates:
        if crud.notification.get_notification_template_by_uuid(db, tpl.uuid) is None:
            crud.notification.create_notification_template(
                db=db,
                uuid=tpl.uuid,
                name=tpl.name,
                name_zh=tpl.name_zh,
                description=tpl.description,
                description_zh=tpl.description_zh,
            )

    # -------- Trigger Events --------
    triggers: list[NotificationTriggerEventProtocol] = [
        RemovedFromSectionNotificationTriggerEvent(),
        SectionUpdatedNotificationTriggerEvent(),
        SectionCommentedNotificationTriggerEvent(),
        SectionSubscribedNotificationTriggerEvent(),
    ]

    for trigger in triggers:
        if crud.notification.get_trigger_event_by_uuid(db, trigger.uuid) is None:
            crud.notification.create_notification_trigger_event(
                db=db,
                uuid=trigger.uuid,
                name=trigger.name,
                name_zh=trigger.name_zh,
                description=trigger.description,
                description_zh=trigger.description_zh,
            )

    # -------- Notification Sources --------
    sources: list[NotificationSourceProtocol] = [
        EmailNotificationSource(),
        AppleNotificationSource(),
        AppleSandBoxNotificationSource(),
        FeishuNotificationSource(),
        DingTalkNotificationSource(),
        TelegramNotificationSource(),
    ]

    for source in sources:
        if crud.notification.get_notification_source_by_uuid(db, source.uuid) is None:
            crud.notification.create_notification_source(
                db=db,
                uuid=source.uuid,
                name=source.name,
                name_zh=source.name_zh,
                description=source.description,
                description_zh=source.description_zh,
                demo_config=source.demo_config,
            )

    # -------- Notification Targets --------
    targets: list[NotificationTargetProtocol] = [
        EmailNotificationTarget(),
        AppleNotificationTarget(),
        AppleSandBoxNotificationTarget(),
        FeishuNotificationTarget(),
        DingTalkNotificationTarget(),
        TelegramNotificationTarget(),
    ]

    for target in targets:
        if crud.notification.get_notification_target_by_uuid(db, target.uuid) is None:
            crud.notification.create_notification_target(
                db=db,
                uuid=target.uuid,
                name=target.name,
                name_zh=target.name_zh,
                description=target.description,
                description_zh=target.description_zh,
                demo_config=target.demo_config,
            )

    # -------- Engines --------
    engines: list[EngineProtocol] = [
        MineruEngine(),
        JinaEngine(),
        MarkitdownEngine(),
        MineruApiEngine(),
        VolcTTSEngine(),
        BananaImageGenerateEngine(),
        OpenAITTSEngine(),
    ]

    for eng in engines:
        if crud.engine.get_engine_by_uuid(db, eng.engine_uuid) is None:
            crud.engine.create_engine(
                db=db,
                category=eng.engine_category,
                uuid=eng.engine_uuid,
                name=eng.engine_name,
                name_zh=eng.engine_name_zh,
                description=eng.engine_description,
                description_zh=eng.engine_description_zh,
                demo_config=eng.engine_demo_config,
            )

    # -------- File Systems --------
    file_systems: list[RemoteFileServiceProtocol] = [
        BuiltInRemoteFileService(),
        AliyunOSSRemoteFileService(),
        AWSS3RemoteFileService(),
        GenericS3RemoteFileService(),
    ]

    for fs in file_systems:
        if crud.file_system.get_file_system_by_uuid(db, fs.file_service_uuid) is None:
            crud.file_system.create_file_system(
                db=db,
                uuid=fs.file_service_uuid,
                name=fs.file_service_name,
                name_zh=fs.file_service_name_zh,
                description=fs.file_service_description,
                description_zh=fs.file_service_description_zh,
                demo_config=fs.file_service_demo_config,
            )


# =========================================================
# 主入口
# =========================================================

if __name__ == "__main__":
    try:
        # 1️⃣ 清库
        drop_schema_postgres()

        # 2️⃣ 用 SQLAlchemy 建表（关键！）
        info_logger.warning("⚠️ Creating tables via SQLAlchemy Base.metadata.create_all()")
        Base.metadata.create_all(bind=engine)
        info_logger.warning("✅ Tables created.")

        # 3️⃣ 同步 Alembic 版本（不跑 migration）
        command.stamp(alembic_cfg, "head")

        # 4️⃣ Seed
        db = SessionLocal()
        try:
            seed_database(db)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

        info_logger.info("✅ Database reset & initialized successfully")

    except Exception as e:
        exception_logger.exception(f"❌ Database initialization failed: {e}")
        raise