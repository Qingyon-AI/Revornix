from typing import cast

import crud
import schemas
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
        
        receiver_id = cast(int, params.get('receiver_id'))
        section_id = cast(int, params.get('section_id'))
        
        if receiver_id is None or section_id is None:
            raise Exception(f"receiver_id or section_id is None, params: {params.items()}")

        with session_scope() as db:
            db_section = crud.section.get_section_by_section_id(
                db=db,
                section_id=section_id
            )
            if not db_section:
                raise Exception("section not found")
            db_user_section = crud.section.get_section_user_by_section_id_and_user_id(
                db=db,
                user_id=receiver_id,
                section_id=section_id
            )
            if not db_user_section:
                raise Exception("user not in section")

            section_title = db_section.title
            section_cover = db_section.cover
            section_creator_id = db_section.creator_id
            section_role = db_user_section.role

        cover = None
        if section_cover is not None:
            cover = await get_remote_file_signed_url(
                user_id=section_creator_id,
                file_name=section_cover
            )
        if section_role == UserSectionRole.MEMBER:
            return schemas.notification.Message(
                title="Section Subscribed",
                content=f"Someone subscribed to section {section_title} that you participate in. Click to view.",
                link=f'/section/detail/{section_id}',
                cover=cover
            )
        elif section_role == UserSectionRole.CREATOR:
            return schemas.notification.Message(
                title="Section Subscribed",
                content=f"Someone subscribed to section {section_title} that you created. Click to view.",
                link=f'/section/detail/{section_id}',
                cover=cover
            )
        else:
            raise Exception("user is not a member or creator of the section")
