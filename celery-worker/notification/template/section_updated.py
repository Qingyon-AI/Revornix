import crud
import schemas
from typing import cast
from data.sql.base import SessionLocal
from enums.section import UserSectionRole
from protocol.notification_template import NotificationTemplate
from protocol.remote_file_service import RemoteFileServiceProtocol

class SectionUpdatedNotificationTemplate(NotificationTemplate):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='4b655b12996540e1b6ee23d16a093bf6',
            name="Section Updated Template",
            name_zh="专栏更新通知模版",
            description="This is a section updated template",
            description_zh="这是一个专栏更新通知模板"
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
        cover = None
        if db_section.cover is not None:
            cover = f'{RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=db_section.creator_id)}/{db_section.cover}'
        if db_user_section.role == UserSectionRole.MEMBER:
            return schemas.notification.Message(
                title="Section Updated",
                content=f"你参与的专栏{db_section.title}有了新的更新，点击前往查看",
                link=f'/section/detail/{section_id}',
                cover=cover
            )
        elif db_user_section.role == UserSectionRole.SUBSCRIBER:
            return schemas.notification.Message(
                title="Section Updated",
                content=f"你订阅的专栏{db_section.title}有了新的更新，点击前往查看",
                link=f'/section/detail/{section_id}',
                cover=cover
            )
        else:
            raise Exception("invalid user section role")