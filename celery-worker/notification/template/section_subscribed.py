import crud
import schemas
from typing import cast
from common.sql import SessionLocal
from enums.section import UserSectionRole
from protocol.notification_template import NotificationTemplate

class SectionSubscribedNotificationTemplate(NotificationTemplate):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='dd4726e202d543cd9eca59e2311d0f11',
            name="Section Subscribed Template",
            name_zh="专栏被订阅通知模版",
            description="This is a section subscribed template",
            description_zh="这是一个专栏被订阅的通知模板"
        )
    
    async def generate(
        self,
        params: dict | None
    ):
        if params is None:
            raise Exception("params is None")
        user_id = cast(int, params.get('user_id'))
        section_id = cast(int, params.get('section_id'))
        db = SessionLocal()
        db_user_section = crud.section.get_section_user_by_section_id_and_user_id(
            db=db,
            user_id=user_id,
            section_id=section_id
        )
        if not db_user_section:
            raise Exception("user not in section")
        db.close()
        if db_user_section.role == UserSectionRole.MEMBER:
            return schemas.notification.Message(
                title=f"Section Commented",
                content="有人订阅了你参与的专栏，点击前往查看",
                link=f'/section/detail/{section_id}'
            )
        elif db_user_section.role == UserSectionRole.SUBSCRIBER:
            return schemas.notification.Message(
                title=f"Section Commented",
                content="有人评价了你参与的专栏，点击前往查看",
                link=f'/section/detail/{section_id}'
            )
        else:
            return None