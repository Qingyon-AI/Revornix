from __future__ import annotations

from dotenv import load_dotenv
load_dotenv(override=True)

import os
from alembic.config import Config
from alembic import command
from sqlalchemy.ext.asyncio import AsyncSession

import crud
from common.logger import exception_logger, info_logger
from config.base import BASE_DIR, ROOT_USER_NAME, ROOT_USER_PASSWORD
from data.sql.base import async_session_context

from common.dependencies import check_deployed_by_official_in_fuc
deployed_by_official = check_deployed_by_official_in_fuc()

# ---------------- Engines ----------------
from engine.image_generate.bailian import BailianImageGenerateEngine
from engine.image_generate.banana import BananaImageGenerateEngine
from engine.image_generate.volc import VolcImageGenerateEngine
from engine.image_understand.kimi import KimiImageUnderstandEngine
from engine.markdown.jina import JinaEngine
from engine.markdown.markitdown import MarkitdownEngine
from engine.markdown.mineru_api import MineruApiEngine
from engine.tts.openai_audio import OpenAIAudioEngine
from engine.tts.volc.tts import VolcTTSEngine
from engine.stt.volc_fast import VolcSTTFastEngine
from engine.stt.volc_standard import VolcSTTStandardEngine

# ---------------- File Systems ----------------
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from file.generic_s3_remote_file_service import GenericS3RemoteFileService

# ---------------- Notification ----------------
from notification.source.apple_notification_source_provided import AppleNotificationSourceProvided
from notification.source.apple_sandbox_notification_source_provided import AppleSandBoxNotificationSourceProvided
from notification.source.dingtalk_notification_source_provided import DingTalkNotificationSourceProvided
from notification.source.email_notification_source_provided import EmailNotificationSourceProvided
from notification.source.feishu_notification_source_provided import FeishuNotificationSourceProvided
from notification.source.telegram_notification_source_provided import TelegramNotificationSourceProvided
from notification.target.apple_notification_target_provided import AppleNotificationTargetProvided
from notification.target.apple_sandbox_notification_target_provided import AppleSandBoxNotificationTargetProvided
from notification.target.dingtalk_notification_target_provided import DingTalkNotificationTargetProvided
from notification.target.email_notification_target_provided import EmailNotificationTargetProvided
from notification.target.feishu_notification_target_provided import FeishuNotificationTargetProvided
from notification.target.telegram_notification_target_provided import TelegramNotificationTargetProvided
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
from protocol.notification_source import NotificationSourceProvidedProtocol
from protocol.notification_target import NotificationTargetProvidedProtocol
from protocol.notification_template import NotificationTemplate
from protocol.notification_trigger import NotificationTriggerEventProtocol
from protocol.remote_file_service import RemoteFileServiceProtocol

from enums.model import OfficialModelProvider, UserModelProviderRole
from enums.engine_enums import Engine, UserEngineRole
from enums.product import PlanAccessLevel
from enums.user import UserRole
from enums.file import RemoteFileService
from enums.notification import UserNotificationSourceRole, UserNotificationTargetRole, NotificationSource

from schemas.error import CustomException

from datetime import datetime
from alembic.util.exc import CommandError
from data.sql.base import engine  # 你得有这个 engine


if not ROOT_USER_NAME or not ROOT_USER_PASSWORD:
    raise RuntimeError("❌ ROOT_USER_NAME or ROOT_USER_PASSWORD is not set.")


# =========================================================
# Alembic 配置：强制与 engine 使用同一数据库
# =========================================================
alembic_cfg = Config(str(BASE_DIR / "alembic.ini"))

# =========================================================
# Seed 数据（要求：尽量幂等）
# 注意：这里仍保留你原逻辑，但强烈建议把 crud.create_* 改成 upsert/on_conflict
# =========================================================
async def seed_database(db: AsyncSession):
    # -------- File Systems --------
    file_systems: list[RemoteFileServiceProtocol] = [
        BuiltInRemoteFileService(),
        AliyunOSSRemoteFileService(),
        AWSS3RemoteFileService(),
        GenericS3RemoteFileService(),
    ]
    for fs in file_systems:
        if await crud.file_system.get_file_system_by_uuid_async(db=db, uuid=fs.file_service_uuid) is None:
            await crud.file_system.create_file_system_async(
                db=db,
                uuid=fs.file_service_uuid,
                name=fs.file_service_name,
                name_zh=fs.file_service_name_zh,
                description=fs.file_service_description,
                description_zh=fs.file_service_description_zh
            )
    # 创建 Root 用户
    db_root_user = await crud.user.get_root_user_async(db=db)
    if db_root_user is None:
        db_root_user = await crud.user.create_base_user_async(
            db=db,
            avatar='default_avatar.png',
            nickname="Revornix Official",
            role=UserRole.ROOT
        )

        db_email_info_for_root_user = await crud.user.get_email_user_by_user_id_async(
            db=db,
            user_id=db_root_user.id
        )
        if db_email_info_for_root_user is None:
            await crud.user.create_email_user_async(
                db=db,
                user_id=db_root_user.id,
                email=ROOT_USER_NAME,
                password=ROOT_USER_PASSWORD
            )
        # init the default file system for the user
        db_file_system = await crud.file_system.get_file_system_by_uuid_async(
            db=db,
            uuid=RemoteFileService.Built_In.meta.id
        )
        if db_file_system is None:
            raise CustomException('The Built-In File System is Not Found', 404)
        db_user_file_system = await crud.file_system.create_user_file_system_async(
            db=db,
            file_system_id=db_file_system.id,
            user_id=db_root_user.id,
            title="Default Minio File System",
            description="The default file system for the user"
        )
        db_root_user.default_user_file_system = db_user_file_system.id
        # create the minio file bucket for the user because it's the default file system
        file_service = BuiltInRemoteFileService()
        file_service.user_id = db_root_user.id
        file_service.bucket = db_root_user.uuid
        await file_service.init_client()
        # 这里不要 commit，统一由外层 commit（更安全）
        await db.flush()

    # -------- Notification Templates --------
    templates: list[NotificationTemplate] = [
        SectionCommentedNotificationTemplate(),
        SectionUpdatedNotificationTemplate(),
        DailySummaryNotificationTemplate(),
        SectionSubscribedNotificationTemplate(),
        RemovedFromSectionNotificationTemplate(),
    ]
    for tpl in templates:
        if await crud.notification.get_notification_template_by_uuid_async(db, tpl.uuid) is None:
            await crud.notification.create_notification_template_async(
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
        if await crud.notification.get_trigger_event_by_uuid_async(db, trigger.uuid) is None:
            await crud.notification.create_notification_trigger_event_async(
                db=db,
                uuid=trigger.uuid,
                name=trigger.name,
                name_zh=trigger.name_zh,
                description=trigger.description,
                description_zh=trigger.description_zh,
            )

    # -------- EngineProvideds --------
    engine_provideds: list[EngineProtocol] = [
        JinaEngine(),
        MarkitdownEngine(),
        MineruApiEngine(),
        VolcTTSEngine(),
        VolcImageGenerateEngine(),
        BailianImageGenerateEngine(),
        BananaImageGenerateEngine(),
        KimiImageUnderstandEngine(),
        OpenAIAudioEngine(),
        VolcSTTFastEngine(),
        VolcSTTStandardEngine()
    ]
    for ep in engine_provideds:
        if await crud.engine.get_engine_provided_by_engine_uuid_async(db=db, engine_provided_uuid=ep.engine_uuid) is None:
            await crud.engine.create_engine_provided_async(
                db=db,
                category=ep.engine_category,
                uuid=ep.engine_uuid,
                name=ep.engine_name,
                name_zh=ep.engine_name_zh,
                description=ep.engine_description,
                description_zh=ep.engine_description_zh,
            )
    
    # -------- Notification Source Provideds --------
    notification_source_provideds: list[NotificationSourceProvidedProtocol] = [
        EmailNotificationSourceProvided(),
        AppleNotificationSourceProvided(),
        AppleSandBoxNotificationSourceProvided(),
        FeishuNotificationSourceProvided(),
        DingTalkNotificationSourceProvided(),
        TelegramNotificationSourceProvided(),
    ]
    for notification_source_provided in notification_source_provideds:
        db_nsp = await crud.notification.get_notification_source_provided_by_uuid_async(
            db=db,
            uuid=notification_source_provided.uuid
        )
        if db_nsp is None:
            await crud.notification.create_notification_source_provided_async(
                db=db,
                uuid=notification_source_provided.uuid,
                name=notification_source_provided.name,
                name_zh=notification_source_provided.name_zh,
                category=notification_source_provided.category,
                description=notification_source_provided.description,
                description_zh=notification_source_provided.description_zh
            )
        elif db_nsp.category is None:
            db_nsp.category = notification_source_provided.category

    # -------- Notification Target Provideds --------
    notification_target_provideds: list[NotificationTargetProvidedProtocol] = [
        EmailNotificationTargetProvided(),
        AppleNotificationTargetProvided(),
        AppleSandBoxNotificationTargetProvided(),
        FeishuNotificationTargetProvided(),
        DingTalkNotificationTargetProvided(),
        TelegramNotificationTargetProvided(),
    ]
    for notification_target_provided in notification_target_provideds:
        db_ntp = await crud.notification.get_notification_target_provided_by_uuid_async(
            db=db,
            uuid=notification_target_provided.uuid
        )
        if db_ntp is None:
            await crud.notification.create_notification_target_provided_async(
                db=db,
                uuid=notification_target_provided.uuid,
                name=notification_target_provided.name,
                name_zh=notification_target_provided.name_zh,
                category=notification_target_provided.category,
                description=notification_target_provided.description,
                description_zh=notification_target_provided.description_zh
            )
        elif db_ntp.category is None:
            db_ntp.category = notification_target_provided.category


    if deployed_by_official:
        # Model Providers and Models
        model_providers: list[OfficialModelProvider] = [OfficialModelProvider.Revornix]
        for provider in model_providers:
            meta = provider.meta
            db_ai_model_provider = await crud.model.get_ai_model_provider_by_uuid_async(db, meta.id)
            if db_ai_model_provider is None:
                db_ai_model_provider = await crud.model.create_ai_model_provider_async(
                    db=db,
                    uuid=meta.id,
                    name=meta.title,
                    description=meta.description,
                    creator_id=db_root_user.id,
                    api_key=os.environ.get("OFFICIAL_MODEL_PROVIDER_API_KEY"),
                    base_url=os.environ.get("OFFICIAL_MODEL_PROVIDER_BASE_URL"),
                    is_public=True
                )
                await crud.model.create_user_ai_model_provider_async(
                    db=db,
                    user_id=db_root_user.id,
                    ai_model_provider_id=db_ai_model_provider.id,
                    role=UserModelProviderRole.CREATOR
                )
            db_provider_models = await crud.model.get_ai_models_for_ai_model_provider_async(
                db=db,
                provider_id=db_ai_model_provider.id,
            )
            seeded_model = next(
                (item for item in db_provider_models if item.name == 'gpt-5.4'),
                None,
            )
            if seeded_model is None:
                await crud.model.create_ai_model_async(
                    db=db,
                    name='gpt-5.4',
                    description='gpt-5.4',
                    required_plan_level=PlanAccessLevel.PRO,
                    provider_id=db_ai_model_provider.id,
                )

        # Engines（注意：这里要从 engine_provided 表取 id，别查 engine 表）
        engines: list[Engine] = [
            Engine.Official_Banana_Image,
            Engine.Official_Bailian_Image,
            Engine.Official_Volc_Image,
            Engine.Official_Volc_TTS,
            Engine.Official_MinerU_API,
            Engine.Official_Volc_Fast_STT,
            Engine.Official_Volc_Standard_STT
        ]
        for e in engines:
            db_engine = await crud.engine.get_engine_by_uuid_async(db=db, engine_uuid=e.meta.uuid)
            if db_engine is None:
                db_engine_provider = await crud.engine.get_engine_provided_by_engine_uuid_async(
                    db=db,
                    engine_provided_uuid=e.meta.engine_provided.meta.uuid
                )
                if db_engine_provider is None:
                    raise RuntimeError(f"❌ EngineProvided {e.meta.engine_provided.meta.uuid} not found")

                db_engine = await crud.engine.create_engine_async(
                    db=db,
                    uuid=e.meta.uuid,
                    name=e.meta.name,
                    description=e.meta.description,
                    is_public=True,
                    required_plan_level=(
                        PlanAccessLevel.PRO
                        if e != Engine.Official_MinerU_API
                        else PlanAccessLevel.FREE
                    ),
                    is_official_hosted=True,
                    billing_mode=(
                        2
                        if e == Engine.Official_MinerU_API
                        else 0
                    ),
                    billing_unit_price=1.0,
                    compute_point_multiplier=1.0,
                    creator_id=db_root_user.id,
                    engine_provided_id=db_engine_provider.id
                )
                await crud.engine.create_user_engine_async(
                    db=db,
                    user_id=db_root_user.id,
                    engine_id=db_engine.id,
                    role=UserEngineRole.CREATOR
                )
        # Notification Sources
        notification_sources = [
            NotificationSource.Official_EMAIL,
            NotificationSource.Official_APPLE,
            NotificationSource.Official_APPLE_SANDBOX,
            NotificationSource.Official_FEISHU,
            NotificationSource.Official_DINGTALK,
            NotificationSource.Official_TELEGRAM
        ]
        for notification_source in notification_sources:
            if await crud.notification.get_notification_source_by_uuid_async(db=db, uuid=notification_source.meta.uuid) is None:
                
                db_notification_source_provided = await crud.notification.get_notification_source_provided_by_uuid_async(
                    db=db,
                    uuid=notification_source.meta.notification_source_provided.meta.uuid
                )
                if db_notification_source_provided is None:
                    raise RuntimeError(f"❌ NotificationSourceProvided {notification_source.meta.notification_source_provided.meta.uuid} not found")
                
                db_notification_source = await crud.notification.create_notification_source_async(
                    db=db,
                    notification_source_provided_id=db_notification_source_provided.id,
                    creator_id=db_root_user.id,
                    title=notification_source.meta.name,
                    description=notification_source.meta.description,
                    uuid=notification_source.meta.uuid,
                    is_public=True
                )
                await crud.notification.create_user_notification_source_async(
                    db=db,
                    user_id=db_root_user.id,
                    notification_source_id=db_notification_source.id,
                    role=UserNotificationSourceRole.CREATOR
                )
        # Notification Targets
        

# =========================================================
# 主入口
# =========================================================
async def main():
    # 让 alembic 与 session_scope 使用同一个库
    alembic_cfg.set_main_option("sqlalchemy.url", str(engine.url))

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
    async with async_session_context() as db:
        try:
            info_logger.info("🌱 Seeding database...")
            await seed_database(db=db)
            await db.commit()
            info_logger.info("✅ Database initialized successfully")
        except Exception as e:
            await db.rollback()
            exception_logger.exception(f"❌ Database initialization failed: {e}")
            raise


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
