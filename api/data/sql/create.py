from __future__ import annotations

from dotenv import load_dotenv
load_dotenv(override=True)

import os
from alembic.config import Config
from alembic import command
from sqlalchemy import text
from sqlalchemy.orm import Session

import crud
from common.logger import exception_logger, info_logger
from config.base import BASE_DIR, ROOT_USER_NAME, ROOT_USER_PASSWORD
from data.sql.base import SessionLocal

from common.dependencies import check_deployed_by_official_in_fuc
deployed_by_official = check_deployed_by_official_in_fuc()

# ---------------- Engines ----------------
from engine.image.banana import BananaImageGenerateEngine
from engine.markdown.jina import JinaEngine
from engine.markdown.markitdown import MarkitdownEngine
from engine.markdown.mineru import MineruEngine
from engine.markdown.mineru_api import MineruApiEngine
from engine.tts.openai_audio import OpenAIAudioEngine
from engine.tts.volc.tts import VolcTTSEngine

# ---------------- File Systems ----------------
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from file.generic_s3_remote_file_service import GenericS3RemoteFileService

# ---------------- Notification ----------------
from notification.source.apple_notification_source import AppleNotificationSource
from notification.source.apple_sandbox_notification_source import AppleSandBoxNotificationSource
from notification.source.dingtalk_notification_source import DingTalkNotificationSource
from notification.source.email_notification_source import EmailNotificationSource
from notification.source.feishu_notification_source import FeishuNotificationSource
from notification.source.telegram_notification_source import TelegramNotificationSource
from notification.target.apple_notification_target import AppleNotificationTarget
from notification.target.apple_sandbox_notification_target import AppleSandBoxNotificationTarget
from notification.target.dingtalk_notification_target import DingTalkNotificationTarget
from notification.target.email_notification_target import EmailNotificationTarget
from notification.target.feishu_notification_target import FeishuNotificationTarget
from notification.target.telegram_notification_target import TelegramNotificationTarget
from notification.template.daily_summary import DailySummaryNotificationTemplate
from notification.template.removed_from_section import RemovedFromSectionNotificationTemplate
from notification.template.section_commented import SectionCommentedNotificationTemplate
from notification.template.section_subscribed import SectionSubscribedNotificationTemplate
from notification.template.section_updated import SectionUpdatedNotificationTemplate
from notification.trigger_event.removed_from_section import RemovedFromSectionNotificationTriggerEvent
from notification.trigger_event.section_commented import SectionCommentedNotificationTriggerEvent
from notification.trigger_event.section_subscribed import SectionSubscribedNotificationTriggerEvent
from notification.trigger_event.section_updated import SectionUpdatedNotificationTriggerEvent

from protocol.engine import EngineProtocol
from protocol.notification_source import NotificationSourceProtocol
from protocol.notification_target import NotificationTargetProtocol
from protocol.notification_template import NotificationTemplate
from protocol.notification_trigger import NotificationTriggerEventProtocol
from protocol.remote_file_service import RemoteFileServiceProtocol

from enums.model import OfficialModelProvider, UserModelProviderRole
from enums.engine_enums import Engine
from enums.user import UserRole
from enums.file import RemoteFileService

from schemas.error import CustomException

from datetime import datetime
from alembic.util.exc import CommandError
from data.sql.base import sqlalchemy_engine  # 你得有这个 engine


# =========================================================
# 环境保护（防止误操作生产）
# =========================================================
ENV = os.getenv("ENV", "development")
ALLOW_DB_RESET = os.getenv("ALLOW_DB_RESET", "0") == "1"

if ENV != "development" and not ALLOW_DB_RESET:
    raise RuntimeError(
        "❌ Refusing to initialize database in non-development environment.\n"
        "Set ALLOW_DB_RESET=1 if you really want to do this."
    )

if not ROOT_USER_NAME or not ROOT_USER_PASSWORD:
    raise RuntimeError("❌ ROOT_USER_NAME or ROOT_USER_PASSWORD is not set.")


# =========================================================
# Alembic 配置：强制与 sqlalchemy_engine 使用同一数据库
# =========================================================
alembic_cfg = Config(str(BASE_DIR / "alembic.ini"))

# =========================================================
# 并发保护：PG advisory lock，避免多进程同时 init/seed
# =========================================================
INIT_LOCK_KEY = 20260121  # 你项目里固定一个整数即可，别随意变

def acquire_init_lock(db: Session) -> bool:
    return bool(db.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": INIT_LOCK_KEY}).scalar())

def release_init_lock(db: Session) -> None:
    db.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": INIT_LOCK_KEY})


# =========================================================
# Seed 数据（要求：尽量幂等）
# 注意：这里仍保留你原逻辑，但强烈建议把 crud.create_* 改成 upsert/on_conflict
# =========================================================
def seed_database(db: Session):
    # -------- File Systems --------
    file_systems: list[RemoteFileServiceProtocol] = [
        BuiltInRemoteFileService(),
        AliyunOSSRemoteFileService(),
        AWSS3RemoteFileService(),
        GenericS3RemoteFileService(),
    ]
    for fs in file_systems:
        if crud.file_system.get_file_system_by_uuid(db=db, uuid=fs.file_service_uuid) is None:
            crud.file_system.create_file_system(
                db=db,
                uuid=fs.file_service_uuid,
                name=fs.file_service_name,
                name_zh=fs.file_service_name_zh,
                description=fs.file_service_description,
                description_zh=fs.file_service_description_zh,
                demo_config=fs.file_service_demo_config,
            )
    # 创建 Root 用户
    db_root_user = crud.user.get_root_user(db=db)
    if db_root_user is None:
        db_root_user = crud.user.create_base_user(
            db=db,
            avatar='default_avatar.png',
            nickname="Revornix Official",
            role=UserRole.ROOT
        )

        db_email_info_for_root_user = crud.user.get_email_user_by_user_id(
            db=db,
            user_id=db_root_user.id
        )
        if db_email_info_for_root_user is None:
            crud.user.create_email_user(
                db=db,
                user_id=db_root_user.id,
                email=ROOT_USER_NAME,
                password=ROOT_USER_PASSWORD
            )
        # init the default file system for the user
        db_file_system = crud.file_system.get_file_system_by_uuid(
            db=db,
            uuid=RemoteFileService.Built_In.meta.id
        )
        if db_file_system is None:
            raise CustomException('The Built-In File System is Not Found', 404)
        db_user_file_system = crud.file_system.create_user_file_system(
            db=db,
            file_system_id=db_file_system.id,
            user_id=db_root_user.id,
            title="Default Minio File System",
            description="The default file system for the user"
        )
        db_root_user.default_user_file_system = db_user_file_system.id
        # create the minio file bucket for the user because it's the default file system
        BuiltInRemoteFileService.ensure_bucket_exists(db_root_user.uuid)
        # 这里不要 commit，统一由外层 commit（更安全）
        db.flush()

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

    # -------- EngineProvideds --------
    engine_provideds: list[EngineProtocol] = [
        MineruEngine(),
        JinaEngine(),
        MarkitdownEngine(),
        MineruApiEngine(),
        VolcTTSEngine(),
        BananaImageGenerateEngine(),
        OpenAIAudioEngine(),
    ]
    for ep in engine_provideds:
        if crud.engine.get_engine_provided_by_engine_uuid(db=db, engine_provided_uuid=ep.engine_uuid) is None:
            crud.engine.create_engine_provided(
                db=db,
                category=ep.engine_category,
                uuid=ep.engine_uuid,
                name=ep.engine_name,
                name_zh=ep.engine_name_zh,
                description=ep.engine_description,
                description_zh=ep.engine_description_zh,
                demo_config=ep.engine_demo_config,
            )

    if deployed_by_official:
        # Model Providers and Models
        model_providers: list[OfficialModelProvider] = [OfficialModelProvider.Revornix]
        for provider in model_providers:
            meta = provider.meta
            if crud.model.get_ai_model_provider_by_uuid(db, meta.id) is None:
                db_ai_model_provider = crud.model.create_ai_model_provider(
                    db=db,
                    uuid=meta.id,
                    name=meta.title,
                    description=meta.description,
                    creator_id=db_root_user.id,
                    api_key=os.environ.get("OFFICIAL_MODEL_PROVIDER_API_KEY"),
                    base_url=os.environ.get("OFFICIAL_MODEL_PROVIDER_BASE_URL"),
                    is_public=True
                )
                crud.model.create_user_ai_model_provider(
                    db=db,
                    user_id=db_root_user.id,
                    ai_model_provider_id=db_ai_model_provider.id,
                    role=UserModelProviderRole.CREATOR
                )
                crud.model.create_ai_model(
                    db=db,
                    name='gpt-5.2',
                    description='gpt-5.2',
                    provider_id=db_ai_model_provider.id
                )

        # Engines（注意：这里要从 engine_provided 表取 id，别查 engine 表）
        engines: list[Engine] = [
            Engine.Official_Banana_Image, 
            Engine.Official_Volc_TTS,
            Engine.Official_MinerU,
            Engine.Official_MinerU_API
        ]
        for e in engines:
            if crud.engine.get_engine_by_uuid(db=db, engine_uuid=e.meta.uuid) is None:
                db_engine_provider = crud.engine.get_engine_provided_by_engine_uuid(
                    db=db,
                    engine_provided_uuid=e.meta.engine_provided.meta.uuid
                )
                if db_engine_provider is None:
                    raise RuntimeError(f"❌ EngineProvided {e.meta.engine_provided.meta.uuid} not found")

                crud.engine.create_engine(
                    db=db,
                    uuid=e.meta.uuid,
                    name=e.meta.name,
                    description=e.meta.description,
                    is_public=True,
                    creator_id=db_root_user.id,
                    engine_provided_id=db_engine_provider.id
                )


# =========================================================
# 主入口
# =========================================================
def main():
    # 让 alembic 与 SessionLocal 使用同一个库
    alembic_cfg.set_main_option("sqlalchemy.url", str(sqlalchemy_engine.url))

    # 1) 自动生成 migration（如果没有变化会报错，我们要吞掉）
    msg = f"auto {datetime.now().strftime('%Y%m%d_%H%M%S')}"
    info_logger.warning(f"STEP 0: Autogenerate migration: {msg}")
    try:
        command.revision(alembic_cfg, message=msg, autogenerate=True)
        info_logger.warning("STEP 0: Migration generated.")
    except CommandError as e:
        # 常见：No changes in schema detected.
        info_logger.warning(f"STEP 0: No migration generated: {e}")

    # 2) 应用到最新
    info_logger.warning("STEP 1: Running alembic upgrade head...")
    command.upgrade(alembic_cfg, "head")
    info_logger.warning("STEP 1: Alembic upgrade done.")

    # 3) seed（你原逻辑）
    db = SessionLocal()
    try:
        info_logger.info("🌱 Seeding database...")
        seed_database(db=db)
        db.commit()
        info_logger.info("✅ Database initialized successfully")
    except Exception as e:
        db.rollback()
        exception_logger.exception(f"❌ Database initialization failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()