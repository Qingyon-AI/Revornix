import crud
import schemas
from typing import cast
from common.sql import SessionLocal
from enums.section import UserSectionRole
from protocol.notification_template import NotificationTemplate

class SectinoCommentedNotificationTemplate(NotificationTemplate):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='1ba024dfd7c249d8a09bb873dca708e6',
            name="Section Commented Template",
            description="This is a section commented template",
            name_zh="专栏被评论通知模版",
            description_zh="这是一个专栏被评论的通知模板"
        )
    
    def set_section_and_user(
        self,
        section_id: int,
        user_id: int
    ):
        self.section_id = section_id
        self.user_id = user_id
        
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
                content="有人评价了你参与的专栏，快去查看吧",
                link=f'/section/detail/{section_id}'
            )
        elif db_user_section.role == UserSectionRole.SUBSCRIBER:
            return schemas.notification.Message(
                title=f"Section Commented",
                content="有人评价了你参与的专栏，快去查看吧",
                link=f'/section/detail/{section_id}'
            )
        else:
            return None