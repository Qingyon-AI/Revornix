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


class SectionJoinRequestedNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='5e7a8d2b4f1c468dbb3c9e2a8f7d1b6c',
            name="Section Join Requested Template",
            name_zh="专栏加入申请通知模版",
            description="This is a section join requested template",
            description_zh="这是有人申请加入专栏时的通知模板"
        )

    async def generate(
        self,
        params: dict | None
    ):
        if params is None:
            raise Exception("params is None")

        receiver_id = cast(int, params.get('receiver_id'))
        section_id = cast(int, params.get('section_id'))
        applicant_id = cast(int, params.get('applicant_id'))
        access_request_id = params.get('access_request_id')
        applicant_message = params.get('message')

        if receiver_id is None or section_id is None or applicant_id is None:
            raise Exception(f"missing required params: {params.items()}")

        async with async_session_context() as db:
            db_section = await crud.section.get_section_by_section_id_async(
                db=db,
                section_id=section_id
            )
            if not db_section:
                raise Exception("section not found")
            db_applicant = await crud.user.get_user_by_id_async(
                db=db,
                user_id=applicant_id,
            )
            if not db_applicant:
                raise Exception("applicant not found")
            section_title = db_section.title
            section_cover = db_section.cover
            section_creator_id = db_section.creator_id
            applicant_name = db_applicant.nickname or "Someone"

        cover = None
        if section_cover is not None:
            cover = await get_remote_file_signed_url(
                user_id=section_creator_id,
                file_name=section_cover
            )

        link = f'/section/detail/{section_id}?access_request_id={access_request_id}' if access_request_id else f'/section/detail/{section_id}'
        base_title = "Join Request"
        message_line = f" Message: \"{applicant_message}\"" if applicant_message else ""
        plain_content = (
            f"{applicant_name} has requested to join section \"{section_title}\"."
            f"{message_line} Open the page to review."
        )

        email_title = f"[{APP_BRAND}] Join request for \"{section_title}\""
        email_html = (
            f"<h2 style='margin:0 0 12px'>New join request</h2>"
            f"<p><strong>{applicant_name}</strong> wants to join <strong>{section_title}</strong>.</p>"
            + (f"<blockquote style='margin:12px 0;color:#555;'>{applicant_message}</blockquote>" if applicant_message else "")
            + f"<p>Open the section to approve or reject the request.</p>"
        )
        email_plain = (
            f"{applicant_name} requested to join \"{section_title}\".{message_line}\n"
            f"Open the section to approve or reject."
        )

        apple_title = "Join request"
        apple_text = f"{applicant_name} wants to join \"{section_title}\"."

        telegram_title = f"Join request · {section_title}"
        telegram_text = (
            f"{applicant_name} wants to join \"{section_title}\".{message_line}\n"
            f"Tap the link to review."
        )

        feishu_title = make_card_title("🙋", f"Join Request · {section_title}")
        feishu_markdown = (
            f"**{applicant_name}** wants to join **{section_title}**.\n\n"
            + (f"> {applicant_message}\n\n" if applicant_message else "")
            + f"Open the section to approve or reject."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 🙋 Join Request\n\n"
            f"**{applicant_name}** wants to join **{section_title}**.\n\n"
            + (f"> {applicant_message}\n\n" if applicant_message else "")
            + f"[Click to review]({link})"
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
