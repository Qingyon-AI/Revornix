import crud
import schemas
from typing import cast
from data.sql.base import session_scope
from enums.section import UserSectionRole
from protocol.notification_template import NotificationTemplate
from common.file import get_remote_file_signed_url

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
        db = session_scope()
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
        cover = None
        if db_section.cover is not None:
            cover = await get_remote_file_signed_url(
                user_id=db_section.creator_id,
                file_name=db_section.cover
            )
        if db_user_section.role == UserSectionRole.MEMBER:
            return schemas.notification.Message(
                title="Section Subscribed",
                content=f"有人订阅了你参与的专栏{db_section.title}，点击前往查看",
                link=f'/section/detail/{section_id}',
                cover=cover
            )
        elif db_user_section.role == UserSectionRole.CREATOR:
            return schemas.notification.Message(
                title="Section Subscribed",
                content=f"有人订阅了创建的专栏{db_section.title}，点击前往查看",
                link=f'/section/detail/{section_id}',
                cover=cover
            )
        else:
            raise Exception("user is not a member or creator of the section")