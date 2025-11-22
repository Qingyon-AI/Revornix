import crud
from common.logger import exception_logger
from common.sql import SessionLocal
from notification.tool.apple import AppleNotificationTool
from notification.tool.apple_sandbox import AppleSandboxNotificationTool
from notification.tool.email import EmailNotificationTool
from enums.notification import NotificationSourceUUID, NotificationContentType

def trigger_user_notification_event(
    user_id: int,
    trigger_event_uuid: str
):
    db = SessionLocal()
    try:
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=user_id
        )
        if db_user is None:
            raise Exception("User not found")
        db_notification_tasks = crud.notification.get_notification_tasks_by_user_id_and_notification_trigger_event(
            db=db,
            user_id=user_id,
            trigger_event_uuid=trigger_event_uuid
        )
        for db_notification_task in db_notification_tasks:
            if db_notification_task.enable:
                title = 'Unknown Message'
                content = None
                cover = None
                if db_notification_task.notification_content_type == NotificationContentType.CUSTOM:
                    db_notification_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
                        db=db,
                        notification_task_id=db_notification_task.id
                    )
                    if db_notification_custom is None:
                        raise Exception("Notification custom not found")
                    title = db_notification_custom.title
                    content = db_notification_custom.content
                elif db_notification_task.notification_content_type == NotificationContentType.TEMPLATE:
                    db_notification_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
                        db=db,
                        notification_task_id=db_notification_task.id
                    )
                    if db_notification_template is None:
                        raise Exception("Notification template not found")
                    raise Exception("Not implemented")
                user_notification_source = crud.notification.get_user_notification_source_by_user_notification_source_id(
                    db=db,
                    user_notification_source_id=db_notification_task.user_notification_source_id
                )
                if user_notification_source is None:
                    raise Exception("User notification source not found")
                notification_source = crud.notification.get_notification_source_by_notification_source_id(
                    db=db,
                    notification_source_id=user_notification_source.notification_source_id
                )
                if notification_source is None:
                    raise Exception("Notification source not found")
                user_notification_target = crud.notification.get_user_notification_target_by_user_notification_target_id(
                    db=db,
                    user_notification_target_id=db_notification_task.user_notification_target_id
                )
                if user_notification_target is None:
                    raise Exception("User notification target not found")
                notification_target = crud.notification.get_notification_target_by_notification_target_id(
                    db=db,
                    notification_target_id=user_notification_target.notification_target_id
                )
                if notification_target is None:
                    raise Exception("Notification target not found")
                crud.notification.create_notification_record(
                    db=db,
                    user_id=user_id,
                    title=title,
                    content=content,
                    cover=cover
                )
                if notification_source.uuid == NotificationSourceUUID.EMAIL.value:
                    notification_tool = EmailNotificationTool()
                    notification_tool.set_source(user_notification_source.id)
                    notification_tool.set_target(user_notification_target.id)
                    notification_tool.send_notification(
                        title=title,
                        content=content,
                    )
                elif notification_source.uuid == NotificationSourceUUID.APPLE.value:
                    notification_tool = AppleNotificationTool()
                    notification_tool.set_source(user_notification_source.id)
                    notification_tool.set_target(user_notification_target.id)
                    notification_tool.send_notification(
                        title=title,
                        content=content,
                        cover=cover,
                    )
                elif notification_source.uuid == NotificationSourceUUID.APPLE_SANDBOX.value:
                    notification_tool = AppleSandboxNotificationTool()
                    notification_tool.set_source(user_notification_source.id)
                    notification_tool.set_target(user_notification_target.id)
                    notification_tool.send_notification(
                        title=title,
                        content=content,
                        cover=cover,
                    )
                else:
                    raise Exception("Notification source not supported")
    except Exception as e:
        exception_logger.error(f'Error sending notification: {str(e)}')
    finally:
        db.close()