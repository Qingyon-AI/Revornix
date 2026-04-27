import crud
import json
import schemas
from common.logger import exception_logger
from data.sql.base import async_session_context
from enums.notification import NotificationSourceProvided, NotificationTemplate
from notification.tool.apple import AppleNotificationTool
from notification.tool.apple_sandbox import AppleSandboxNotificationTool
from notification.tool.dingtalk import DingTalkNotificationTool
from notification.tool.email import EmailNotificationTool
from notification.tool.feishu import FeishuNotificationTool
from notification.tool.telegram import TelegramNotificationTool
from notification.template.document_podcast_ready import DocumentPodcastReadyNotificationTemplate
from notification.template.document_process_completed import DocumentProcessCompletedNotificationTemplate
from notification.template.removed_from_section import RemovedFromSectionNotificationTemplate
from notification.template.section_commented import SectionCommentedNotificationTemplate
from notification.template.section_content_updated import SectionContentUpdatedNotificationTemplate
from notification.template.section_podcast_ready import SectionPodcastReadyNotificationTemplate
from notification.template.section_ppt_ready import SectionPptReadyNotificationTemplate
from notification.template.section_updated import SectionUpdatedNotificationTemplate
from notification.template.section_subscribed import SectionSubscribedNotificationTemplate
from common.encrypt import decrypt_notification_source_config, decrypt_notification_target_config

class NotificationProxy:
    
    def __init__(self) -> None:
        pass

    @staticmethod
    def resolve_message_for_channel(
        *,
        message: schemas.notification.Message,
        channel_key: str,
    ) -> schemas.notification.Message:
        resolved = message.model_copy(deep=True)
        if message.variants is None:
            return resolved

        variant = message.variants.get(channel_key)
        if variant is None:
            return resolved

        if variant.title is not None:
            resolved.title = variant.title
        if variant.content is not None:
            resolved.content = variant.content
        if variant.content_type is not None:
            resolved.content_type = variant.content_type
        if variant.plain_content is not None:
            resolved.plain_content = variant.plain_content
        if variant.link is not None:
            resolved.link = variant.link
        if variant.cover is not None:
            resolved.cover = variant.cover
        return resolved

    # =========================
    # Factory（唯一推荐入口）
    # =========================
    @staticmethod
    async def create_notification_tool(
        *,
        user_id: int,
        notification_source_id: int,
        notification_target_id: int
    ):
        async with async_session_context() as db:
            db_user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=user_id
            )
            if db_user is None:
                raise Exception("User not found")

            notification_source = await crud.notification.get_notification_source_by_id_async(
                db=db,
                notification_source_id=notification_source_id
            )
            if notification_source is None:
                raise Exception("Notification source not found")
            
            notification_target = await crud.notification.get_notification_target_by_id_async(
                db=db,
                notification_target_id=notification_target_id
            )
            if notification_target is None:
                raise Exception("Notification target not found")

            notification_tool = None

            if notification_source.notification_source_provided.uuid == NotificationSourceProvided.EMAIL.meta.uuid:
                notification_tool = EmailNotificationTool()
            elif notification_source.notification_source_provided.uuid == NotificationSourceProvided.APPLE.meta.uuid:
                notification_tool = AppleNotificationTool()
            elif notification_source.notification_source_provided.uuid == NotificationSourceProvided.APPLE_SANDBOX.meta.uuid:
                notification_tool = AppleSandboxNotificationTool()
            elif notification_source.notification_source_provided.uuid == NotificationSourceProvided.FEISHU.meta.uuid:
                notification_tool = FeishuNotificationTool()
            elif notification_source.notification_source_provided.uuid == NotificationSourceProvided.DINGTALK.meta.uuid:
                notification_tool = DingTalkNotificationTool()
            elif notification_source.notification_source_provided.uuid == NotificationSourceProvided.TELEGRAM.meta.uuid:
                notification_tool = TelegramNotificationTool()
            else:
                raise Exception("Notification source not supported")
            
            if notification_source.config_json is not None:
                notification_tool.set_source_config(
                    json.loads(decrypt_notification_source_config(notification_source.config_json))
                )

            if notification_target.config_json is not None:
                notification_tool.set_target_config(
                    json.loads(decrypt_notification_target_config(notification_target.config_json))
                )
            
            return notification_tool

    @staticmethod
    async def create_message_using_template(
        *,
        template_id: int,
        params: dict | None = None
    ):
        template_uuid: str | None = None
        async with async_session_context() as db:
            db_notification_template = await crud.notification.get_notification_template_by_id_async(
                db=db,
                notification_template_id=template_id
            )
            if db_notification_template is None:
                raise Exception("Notification template not found")
            template_uuid = db_notification_template.uuid

        if template_uuid == NotificationTemplate.SECTION_COMMENTED.meta.uuid:
            notification_template = SectionCommentedNotificationTemplate()
        elif template_uuid == NotificationTemplate.SECTION_UPDATED.meta.uuid:
            notification_template = SectionUpdatedNotificationTemplate()
        elif template_uuid == NotificationTemplate.SECTION_SUBSCRIBED.meta.uuid:
            notification_template = SectionSubscribedNotificationTemplate()
        elif template_uuid == NotificationTemplate.REMOVED_FROM_SECTION.meta.uuid:
            notification_template = RemovedFromSectionNotificationTemplate()
        elif template_uuid == NotificationTemplate.SECTION_CONTENT_UPDATED.meta.uuid:
            notification_template = SectionContentUpdatedNotificationTemplate()
        elif template_uuid == NotificationTemplate.SECTION_PODCAST_READY.meta.uuid:
            notification_template = SectionPodcastReadyNotificationTemplate()
        elif template_uuid == NotificationTemplate.SECTION_PPT_READY.meta.uuid:
            notification_template = SectionPptReadyNotificationTemplate()
        elif template_uuid == NotificationTemplate.DOCUMENT_PROCESS_COMPLETED.meta.uuid:
            notification_template = DocumentProcessCompletedNotificationTemplate()
        elif template_uuid == NotificationTemplate.DOCUMENT_PODCAST_READY.meta.uuid:
            notification_template = DocumentPodcastReadyNotificationTemplate()
        else:
            raise Exception('Unsupported notification template')

        message = await notification_template.generate(
            params=params
        )
        if message is None:
            raise Exception(f'Failed to generate the message using template {template_id}')

        return message
