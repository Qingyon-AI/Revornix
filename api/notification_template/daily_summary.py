import crud
import schemas
from protocol.notification_template import NotificationTemplate
from common.sql import SessionLocal
from common.file import RemoteFileService
from common.common import create_upload_token
from datetime import datetime, timezone

class DailySummaryNotificationTemplate(NotificationTemplate):
    def __init__(self, user_id: int | None = None):
        super().__init__(
            template_name="Daily Summary Template",
            template_description="This is a daily summary template",
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
        md_file_name = db_section.md_file_name
        db_user = crud.user.get_user_by_id(db=db, 
                                           user_id=self.user_id)
        authorization = create_upload_token(db_user)
        remote_file_service = RemoteFileService(authorization=authorization)
        markdown_content = await remote_file_service.get_object_content(file_path=md_file_name)
        return schemas.notification.Message(
            title=f"Daily Summary Of {date_str}",
            content=markdown_content
        )
        