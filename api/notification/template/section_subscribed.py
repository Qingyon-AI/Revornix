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
        elif section_role == UserSectionRole.CREATOR:
            relation_phrase = "you created"
        else:
            raise Exception("user is not a member or creator of the section")

        link = f'/section/detail/{section_id}'
        base_title = "New Subscriber"
        plain_content = f"Someone subscribed to section \"{section_title}\" that {relation_phrase}. Click to view."

        email_title = f"[{APP_BRAND}] \"{section_title}\" has a new subscriber"
        email_html = (
            f"<h2 style='margin:0 0 12px'>You have a new subscriber</h2>"
            f"<p>Someone just subscribed to <strong>{section_title}</strong> that {relation_phrase}.</p>"
            f"<p>Open the section page to see the latest subscriber activity.</p>"
        )
        email_plain = (
            f"You have a new subscriber.\n\n"
            f"Someone subscribed to \"{section_title}\" ({relation_phrase}). "
            f"Open the section page to see the latest activity."
        )

        apple_title = "New subscriber"
        apple_text = f"\"{section_title}\" has a new subscriber."

        telegram_title = f"New subscriber · {section_title}"
        telegram_text = (
            f"Someone just subscribed to \"{section_title}\" ({relation_phrase}).\n"
            f"Tap the link to view."
        )

        feishu_title = make_card_title("🌟", f"New Subscriber · {section_title}")
        feishu_markdown = (
            f"Someone just subscribed to **{section_title}** that {relation_phrase}.\n\n"
            f"Open the section page to see the latest activity."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 🌟 New Subscriber\n\n"
            f"Someone subscribed to **{section_title}** that {relation_phrase}.\n\n"
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
