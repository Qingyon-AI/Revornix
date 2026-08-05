from typing import cast

import crud
from data.sql.base import async_session_context
from notification.template.platform_message_builder import (
    APP_BRAND,
    build_multi_platform_message,
    make_card_title,
)
from protocol.notification_template import NotificationTemplate
from common.file import get_remote_file_signed_url


class SectionJoinRequestHandledNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='b4c2d8f1a3e549fdb7c9e2a6d8f1b3c5',
            name="Section Join Request Handled Template",
            name_zh="专栏加入申请处理结果通知模版",
            description="This is the template sent to the applicant when a section join request is handled",
            description_zh="这是审批专栏加入申请后通知申请人的模板"
        )

    async def generate(
        self,
        params: dict | None
    ):
        if params is None:
            raise Exception("params is None")

        receiver_id = cast(int, params.get('receiver_id'))
        section_id = cast(int, params.get('section_id'))
        approved = bool(params.get('approved'))
        handle_message = params.get('handle_message')

        if receiver_id is None or section_id is None:
            raise Exception(f"missing required params: {params.items()}")

        async with async_session_context() as db:
            db_section = await crud.section.get_section_by_section_id_async(
                db=db,
                section_id=section_id
            )
            if not db_section:
                raise Exception("section not found")
            section_title = db_section.title
            section_cover = db_section.cover
            section_creator_id = db_section.creator_id

        cover = None
        if section_cover is not None:
            cover = await get_remote_file_signed_url(
                user_id=section_creator_id,
                file_name=section_cover
            )

        link = f'/section/detail/{section_id}'
        decision_word = "approved" if approved else "rejected"
        decision_emoji = "🎉" if approved else "🚫"

        base_title = f"Request {decision_word}"
        message_line = f" Note: \"{handle_message}\"" if handle_message else ""
        plain_content = f"Your request to join \"{section_title}\" has been {decision_word}.{message_line}"

        email_title = f"[{APP_BRAND}] Your join request was {decision_word}"
        email_html = (
            f"<h2 style='margin:0 0 12px'>Request {decision_word}</h2>"
            f"<p>Your request to join <strong>{section_title}</strong> has been <strong>{decision_word}</strong>.</p>"
            + (f"<blockquote style='margin:12px 0;color:#555;'>{handle_message}</blockquote>" if handle_message else "")
            + (f"<p>Open the section to start participating.</p>" if approved else "")
        )
        email_plain = (
            f"Your join request for \"{section_title}\" was {decision_word}.{message_line}"
        )

        apple_title = base_title
        apple_text = f"Your request to join \"{section_title}\" was {decision_word}."

        telegram_title = f"{base_title} · {section_title}"
        telegram_text = (
            f"Your request to join \"{section_title}\" was {decision_word}.{message_line}"
        )

        feishu_title = make_card_title(decision_emoji, f"{base_title} · {section_title}")
        feishu_markdown = (
            f"Your request to join **{section_title}** has been **{decision_word}**.\n\n"
            + (f"> {handle_message}\n" if handle_message else "")
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### {decision_emoji} Request {decision_word}\n\n"
            f"Your request to join **{section_title}** has been **{decision_word}**.\n\n"
            + (f"> {handle_message}\n\n" if handle_message else "")
            + f"[Open section]({link})"
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
