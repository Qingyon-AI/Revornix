import crud
import json
import models
import schemas
from common.logger import exception_logger
from data.sql.base import session_scope
from enums.notification import NotificationSourceProvided
from notification.tool.apple import AppleNotificationTool
from notification.tool.apple_sandbox import AppleSandboxNotificationTool
from notification.tool.dingtalk import DingTalkNotificationTool
from notification.tool.email import EmailNotificationTool
from notification.tool.feishu import FeishuNotificationTool
from notification.tool.telegram import TelegramNotificationTool
from common.encrypt import decrypt_notification_source_config, decrypt_notification_target_config
from notification.template.platform_message_builder import build_multi_platform_message

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
    def create_notification_tool(
        *,
        user_id: int,
        notification_source_id: int,
        notification_target_id: int
    ):
        db = session_scope()
        try:
            db_user = crud.user.get_user_by_id(
                db=db,
                user_id=user_id
            )
            if db_user is None:
                raise Exception("User not found")

            notification_source = crud.notification.get_notification_source_by_id(
                db=db,
                notification_source_id=notification_source_id
            )
            if notification_source is None:
                raise Exception("Notification source not found")
            
            notification_target = crud.notification.get_notification_target_by_id(
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
        except Exception as e:
            exception_logger.error(f'Failed to create notification proxy: {e}')
            raise
        finally:
            db.close()

    @staticmethod
    async def create_message_using_template(
        *,
        template_id: int,
        params: dict | None = None
    ):
        with session_scope() as db:
            db_notification_template = crud.notification.get_notification_template_by_id(
                db=db,
                notification_template_id=template_id
            )
            if db_notification_template is None:
                raise Exception("Notification template not found")

        if db_notification_template.title_template is None:
            raise Exception('Unsupported notification template')

        template_params = params or {}
        title = db_notification_template.title_template
        content = db_notification_template.content_template
        link = db_notification_template.link_template
        cover = db_notification_template.cover_template
        for key, value in template_params.items():
            placeholder = f"{{{{{key}}}}}"
            value_str = "" if value is None else str(value)
            title = title.replace(placeholder, value_str)
            if content is not None:
                content = content.replace(placeholder, value_str)
            if link is not None:
                link = link.replace(placeholder, value_str)
            if cover is not None:
                cover = cover.replace(placeholder, value_str)
        return build_multi_platform_message(
            title=title,
            plain_content=content or "",
            link=link,
            cover=cover,
        )
