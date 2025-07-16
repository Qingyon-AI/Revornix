import crud
import schemas
from protocol.notification_template import NotificationTemplate
from common.sql import SessionLocal
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from datetime import datetime, timezone

class DailySummaryNotificationTemplate(NotificationTemplate):
    def __init__(self, user_id: int | None = None):
        super().__init__(
            template_id=1,
            template_name="Daily Summary Template",
            template_description="This is a daily summary template",
            template_name_zh="每日总结模板",
            template_description_zh="这是一个每日总结模板",
            template_version="0.0.1"
        )
        if user_id is not None:
            self.user_id = user_id
    async def generate(self):
        db = SessionLocal()
        date_str = datetime.now(tz=timezone.utc).strftime('%Y-%m-%d')
        db_section = crud.section.get_section_by_user_and_date(db=db, 
                                                               user_id=self.user_id,
                                                               date=date_str)
        if db_section is None:
            return schemas.notification.Message(
                title=f"Daily Summary Of {date_str}",
                content="No Summary Today"
            )
        md_file_name = db_section.md_file_name
        db_user = crud.user.get_user_by_id(db=db, 
                                           user_id=self.user_id)
        default_file_system = db_user.default_file_system
        if default_file_system is None:
            raise Exception('Please set the default file system for the user first.')
        else:
            if default_file_system == 1:
                remote_file_service = BuiltInRemoteFileService(user_id=self.user_id)
            elif default_file_system == 2:
                remote_file_service = AliyunOSSRemoteFileService(user_id=self.user_id)
        markdown_content = await remote_file_service.get_file_content_by_file_path(file_path=md_file_name)
        return schemas.notification.Message(
            title=f"Daily Summary Of {date_str}",
            content=markdown_content
        )
        