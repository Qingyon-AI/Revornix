from typing import cast

import crud
from data.sql.base import async_session_context
from enums.section import UserSectionRole
from notification.template.platform_message_builder import build_multi_platform_message
from protocol.notification_template import NotificationTemplate
from common.file import get_remote_file_signed_url


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
        
        receiver_id = cast(int, params.get('receiver_id'))
        section_id = cast(int, params.get('section_id'))
        
        if receiver_id is None or section_id is None:
            raise Exception(f"receiver_id or section_id is None, params: {params.items()}")

        async with async_session_context() as db:
            db_section = await crud.section.get_section_by_section_id_async(
                db=db,
                section_id=section_id
            )
            if not db_section:
                raise Exception("section not found")
            db_user_section = await crud.section.get_section_user_by_section_id_and_user_id_async(
                db=db,
                section_id=section_id,
                user_id=receiver_id,
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
        title = "Section Updated"
        if section_role == UserSectionRole.MEMBER:
            plain_content = f"Section {section_title} that you participate in has been updated. Click to view."
        elif section_role == UserSectionRole.SUBSCRIBER:
            plain_content = f"Section {section_title} that you subscribed to has been updated. Click to view."
        else:
            raise Exception("invalid user section role")

        link = f'/section/detail/{section_id}'
        markdown_content = f"### {title}\n\n{plain_content}"
        email_html = (
            f"<p>{plain_content}</p>"
            "<p>Open the section page to read the newest update.</p>"
        )
        return build_multi_platform_message(
            title=title,
            plain_content=plain_content,
            link=link,
            cover=cover,
            email_html=email_html,
            email_plain=plain_content,
            feishu_markdown=markdown_content,
            dingtalk_markdown=markdown_content,
            telegram_text=plain_content,
            apple_text=plain_content,
        )
