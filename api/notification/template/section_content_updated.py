from typing import cast

import crud
from data.sql.base import async_session_context
from enums.section import UserSectionRole
from notification.template.platform_message_builder import (
    APP_BRAND,
    build_multi_platform_message,
    make_card_title,
)
from protocol.notification_template import NotificationTemplate
from common.file import get_remote_file_signed_url


class SectionContentUpdatedNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='9d7e5b2c4a3f4d8eb1c7e6d5a2b3f1e9',
            name="Section Content Updated Template",
            name_zh="专栏内容被编辑通知模版",
            description="This is a section content updated template",
            description_zh="这是一个专栏元数据被编辑的通知模板"
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

        if section_role == UserSectionRole.MEMBER:
            relation_phrase = "you participate in"
        elif section_role == UserSectionRole.SUBSCRIBER:
            relation_phrase = "you subscribed to"
        else:
            raise Exception("invalid user section role")

        link = f'/section/detail/{section_id}'
        base_title = "Section Content Edited"
        plain_content = f"Section \"{section_title}\" that {relation_phrase} has been edited. Click to view."

        email_title = f"[{APP_BRAND}] \"{section_title}\" was edited"
        email_html = (
            f"<h2 style='margin:0 0 12px'>Section content edited</h2>"
            f"<p>The section <strong>{section_title}</strong> that {relation_phrase} has been edited (title, description, cover or labels).</p>"
            f"<p>Open the section page to see the changes.</p>"
        )
        email_plain = (
            f"Section content edited.\n\n"
            f"\"{section_title}\" ({relation_phrase}) has been edited. "
            f"Open the section page to see the changes."
        )

        apple_title = "Section edited"
        apple_text = f"\"{section_title}\" was edited."

        telegram_title = f"Section edited · {section_title}"
        telegram_text = (
            f"Section \"{section_title}\" ({relation_phrase}) was edited.\n"
            f"Tap the link to view."
        )

        feishu_title = make_card_title("✏️", f"Section Edited · {section_title}")
        feishu_markdown = (
            f"**{section_title}** that {relation_phrase} was edited.\n\n"
            f"Open the section page to see the changes."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### ✏️ Section Edited\n\n"
            f"**{section_title}** that {relation_phrase} was edited.\n\n"
            f"[Click to view details]({link})"
        )

        return build_multi_platform_message(
            title=base_title,
            plain_content=plain_content,
            link=link,
            cover=cover,
            email_title=email_title,
            email_html=email_html,
            email_plain=email_plain,
            apple_title=apple_title,
            apple_text=apple_text,
            apple_sandbox_title=apple_title,
            apple_sandbox_text=apple_text,
            telegram_title=telegram_title,
            telegram_text=telegram_text,
            feishu_title=feishu_title,
            feishu_markdown=feishu_markdown,
            dingtalk_title=dingtalk_title,
            dingtalk_markdown=dingtalk_markdown,
        )
