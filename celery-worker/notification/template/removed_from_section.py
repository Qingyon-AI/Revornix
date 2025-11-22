import crud
import schemas
from typing import cast
from common.sql import SessionLocal
from enums.section import UserSectionRole
from protocol.notification_template import NotificationTemplate

class RemovedFromSectionNotificationTemplate(NotificationTemplate):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='25a2b86e0ed24ef1964ea94d906ebbd7',
            name="Removed From Section Template",
            name_zh="被移出专栏通知模版",
            description="This is a user removed by the section participants notification template",
            description_zh="这是一个你被移出专栏的通知模板"
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
        db_section = crud.section.get_section_by_section_id(
            db=db, 
            section_id=section_id
        )
        if not db_section:
            raise Exception("section not found")
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
                title=f"You are removed from Section",
                content=f"您已经从专栏{db_section.title}被移出，后续将无法参与该专栏的协作和收到更新通知，如有异议，请联系专栏所有者",
                link=f'/section/detail/{section_id}'
            )
        elif db_user_section.role == UserSectionRole.SUBSCRIBER:
            return schemas.notification.Message(
                title=f"You are removed from Section",
                content=f"您已经从专栏{db_section.title}被移出，后续将无法收到该专栏的更新通知，如有异议，请联系专栏所有者",
                link=f'/section/detail/{section_id}'
            )
        else:
            raise Exception("invalid user section role")