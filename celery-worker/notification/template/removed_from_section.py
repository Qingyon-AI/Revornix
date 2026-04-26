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

        receiver_id = cast(int, params.get('receiver_id'))
        section_id = cast(int, params.get('section_id'))

        if receiver_id is None or section_id is None:
            raise Exception(f"receiver_id or section_id is None, params: {params.items()}")

        section_title = "this section"
        section_cover = None
        section_creator_id = None
        section_role = None

        async with async_session_context() as db:
            db_section = await crud.section.get_section_by_section_id_async(
                db=db,
                section_id=section_id
            )
            if db_section is not None:
                section_title = db_section.title
                section_cover = db_section.cover
                section_creator_id = db_section.creator_id

            db_user_section = await crud.section.get_section_user_by_section_id_and_user_id_async(
                db=db,
                section_id=section_id,
                user_id=receiver_id,
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

        if section_role == UserSectionRole.MEMBER:
            consequence = (
                "You will no longer be able to collaborate on this section "
                "or receive update notifications."
            )
        elif section_role == UserSectionRole.SUBSCRIBER:
            consequence = "You will no longer receive update notifications for this section."
        else:
            consequence = "You no longer have access to this section."

        link = f'/section/detail/{section_id}'
        base_title = "Removed from Section"
        plain_content = (
            f"You have been removed from section \"{section_title}\". {consequence} "
            "If you have any questions, please contact the section owner."
        )

        email_title = f"[{APP_BRAND}] You were removed from \"{section_title}\""
        email_html = (
            f"<h2 style='margin:0 0 12px'>Section access change</h2>"
            f"<p>You have been removed from <strong>{section_title}</strong>.</p>"
            f"<p>{consequence}</p>"
            f"<p>If you have any questions, please contact the section owner.</p>"
        )
        email_plain = (
            f"Section access change.\n\n"
            f"You have been removed from \"{section_title}\". {consequence} "
            "If you have any questions, please contact the section owner."
        )

        apple_title = "Section access removed"
        apple_text = f"You were removed from \"{section_title}\"."

        telegram_title = f"Removed · {section_title}"
        telegram_text = (
            f"You have been removed from \"{section_title}\".\n"
            f"{consequence}"
        )

        feishu_title = make_card_title("🚪", f"Removed from Section · {section_title}")
        feishu_markdown = (
            f"You have been removed from **{section_title}**.\n\n"
            f"{consequence}\n\n"
            f"If you have any questions, please contact the section owner."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 🚪 Removed from Section\n\n"
            f"You have been removed from **{section_title}**.\n\n"
            f"{consequence}\n\n"
            f"If you have any questions, please contact the section owner."
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
