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

        if section_role == UserSectionRole.MEMBER:
            relation_phrase = "you participate in"
        elif section_role == UserSectionRole.SUBSCRIBER:
            relation_phrase = "you subscribed to"
        else:
            raise Exception("invalid user section role")

        link = f'/section/detail/{section_id}'
        base_title = "Section Updated"
        plain_content = f"Section \"{section_title}\" that {relation_phrase} has been updated. Click to view."

        # Email: descriptive subject, HTML body with heading + paragraphs + CTA cue
        email_title = f"[{APP_BRAND}] \"{section_title}\" has new updates"
        email_html = (
            f"<h2 style='margin:0 0 12px'>Your section has new updates</h2>"
            f"<p>The section <strong>{section_title}</strong> that {relation_phrase} has been updated.</p>"
            f"<p>Open the section page to read the latest changes.</p>"
        )
        email_plain = (
            f"Your section has new updates.\n\n"
            f"\"{section_title}\" ({relation_phrase}) has been updated. "
            f"Open the section page to read the latest changes."
        )

        # Apple/APNs: short title for lockscreen, single concise line
        apple_title = "Section updated"
        apple_text = f"\"{section_title}\" has new updates."

        # Telegram: tool already prefixes 📢; keep title short
        telegram_title = f"Section updated · {section_title}"
        telegram_text = (
            f"Section \"{section_title}\" ({relation_phrase}) has new updates.\n"
            f"Tap the link to view."
        )

        # Feishu / DingTalk: card with emoji + bold key term; DingTalk needs CTA in body
        feishu_title = make_card_title("📬", f"Section Updated · {section_title}")
        feishu_markdown = (
            f"**{section_title}** that {relation_phrase} has new updates.\n\n"
            f"Open the section page to read the latest changes."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 📬 Section Updated\n\n"
            f"**{section_title}** that {relation_phrase} has new updates.\n\n"
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
