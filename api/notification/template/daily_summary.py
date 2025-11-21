import crud
import schemas
from common.sql import SessionLocal
from datetime import date as date_type
from common.common import get_user_remote_file_system
from protocol.notification_template import NotificationTemplate

class DailySummaryNotificationTemplate(NotificationTemplate):
    
    user_id: int
    date: date_type
    
    def __init__(self):
        super().__init__(
            template_id=1,
            template_name="Daily Summary Template",
            template_description="This is a daily summary template",
            template_name_zh="每日总结模板",
            template_description_zh="这是一个每日总结模板"
        )
        
    def set_user_and_date(
        self, 
        user_id: int,
        date: date_type
    ):
        self.user_id = user_id
        self.date = date
        
    async def generate(
        self
    ):
        db = SessionLocal()
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=self.user_id
        )
        if db_user is None:
            raise Exception("The user who is about to send notification is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user who is about to send notification havn't set default user file system")

        db_section = crud.section.get_section_by_user_and_date(
            db=db, 
            user_id=self.user_id,
            date=self.date
        )
        if db_section is None or db_section.md_file_name is None:
            return schemas.notification.Message(
                title=f"Daily Summary Of {self.date.isoformat()}",
                content="No Summary Today For Now"
            )
        
        remote_file_service = await get_user_remote_file_system(
            user_id=self.user_id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=db_user.default_user_file_system
        )
        markdown_content = await remote_file_service.get_file_content_by_file_path(
            file_path=db_section.md_file_name
        )
        db.close()
        return schemas.notification.Message(
            title=f"Daily Summary Of {self.date.isoformat()}",
            content=markdown_content
        )
        