from typing import cast

import crud
from data.sql.base import session_scope
from enums.section import UserSectionRole
from notification.template.platform_message_builder import build_multi_platform_message
from protocol.notification_template import NotificationTemplate
from common.file import get_remote_file_signed_url

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
        self.parameters = [
            {"key": "receiver_id", "label": "Receiver ID", "label_zh": "接收者 ID", "value_type": "number", "required": True},
            {"key": "section_id", "label": "Section ID", "label_zh": "专栏 ID", "value_type": "number", "required": True},
        ]

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

        section_title = "this section"
        section_cover = None
        section_creator_id = None
        section_role = None

        with session_scope() as db:
            db_section = crud.section.get_section_by_section_id(
                db=db,
                section_id=section_id
            )
            if db_section is not None:
                section_title = db_section.title
                section_cover = db_section.cover
                section_creator_id = db_section.creator_id

            db_user_section = crud.section.get_section_user_by_section_id_and_user_id(
                db=db,
                user_id=receiver_id,
                section_id=section_id
            )
            if db_user_section is not None:
                section_role = db_user_section.role

        cover = None
        if section_cover is not None and section_creator_id is not None:
            try:
                cover = await get_remote_file_signed_url(
                    user_id=section_creator_id,
                    file_name=section_cover
                )
            except Exception:
                cover = None
        title = "You Are Removed from Section"
        if section_role == UserSectionRole.MEMBER:
            plain_content = (
                f"You have been removed from section {section_title}. "
                "You will no longer be able to collaborate on this section or receive update notifications. "
                "If you have any questions, please contact the section owner."
            )
        elif section_role == UserSectionRole.SUBSCRIBER:
            plain_content = (
                f"You have been removed from section {section_title}. "
                "You will no longer receive update notifications for this section. "
                "If you have any questions, please contact the section owner."
            )
        else:
            plain_content = (
                f"You have been removed from section {section_title}. "
                "If you have any questions, please contact the section owner."
            )

        link = f'/section/detail/{section_id}'
        markdown_content = f"### {title}\n\n{plain_content}"
        email_html = (
            f"<p>{plain_content}</p>"
            "<p>If needed, contact the section owner for more details.</p>"
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
