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


class DocumentJoinRequestedNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='a8f3b1c5d2e4476ab9c8e2d7f1a4b6c9',
            name="Document Join Requested Template",
            name_zh="文档协作申请通知模版",
            description="This is a document join requested template",
            description_zh="这是有人申请协作文档时的通知模板"
        )

    async def generate(
        self,
        params: dict | None
    ):
        if params is None:
            raise Exception("params is None")

        receiver_id = cast(int, params.get('receiver_id'))
        document_id = cast(int, params.get('document_id'))
        applicant_id = cast(int, params.get('applicant_id'))
        access_request_id = params.get('access_request_id')
        applicant_message = params.get('message')

        if receiver_id is None or document_id is None or applicant_id is None:
            raise Exception(f"missing required params: {params.items()}")

        async with async_session_context() as db:
            db_document = await crud.document.get_document_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if not db_document:
                raise Exception("document not found")
            db_applicant = await crud.user.get_user_by_id_async(
                db=db,
                user_id=applicant_id,
            )
            if not db_applicant:
                raise Exception("applicant not found")
            document_title = db_document.title or "Untitled document"
            document_cover = db_document.cover
            document_creator_id = db_document.creator_id
            applicant_name = db_applicant.nickname or "Someone"

        cover = None
        if document_cover is not None:
            cover = await get_remote_file_signed_url(
                user_id=document_creator_id,
                file_name=document_cover,
            )

        link = f'/document/detail/{document_id}?access_request_id={access_request_id}' if access_request_id else f'/document/detail/{document_id}'
        base_title = "Collaboration Request"
        message_line = f" Message: \"{applicant_message}\"" if applicant_message else ""
        plain_content = (
            f"{applicant_name} has requested to collaborate on \"{document_title}\"."
            f"{message_line} Open the page to review."
        )

        email_title = f"[{APP_BRAND}] Collaboration request for \"{document_title}\""
        email_html = (
            f"<h2 style='margin:0 0 12px'>New collaboration request</h2>"
            f"<p><strong>{applicant_name}</strong> wants to collaborate on <strong>{document_title}</strong>.</p>"
            + (f"<blockquote style='margin:12px 0;color:#555;'>{applicant_message}</blockquote>" if applicant_message else "")
            + f"<p>Open the document to approve or reject the request.</p>"
        )
        email_plain = (
            f"{applicant_name} requested to collaborate on \"{document_title}\".{message_line}\n"
            f"Open the document to approve or reject."
        )

        apple_title = "Collaboration request"
        apple_text = f"{applicant_name} wants to collaborate on \"{document_title}\"."

        telegram_title = f"Collaboration request · {document_title}"
        telegram_text = (
            f"{applicant_name} wants to collaborate on \"{document_title}\".{message_line}\n"
            f"Tap the link to review."
        )

        feishu_title = make_card_title("🙋", f"Collaboration · {document_title}")
        feishu_markdown = (
            f"**{applicant_name}** wants to collaborate on **{document_title}**.\n\n"
            + (f"> {applicant_message}\n\n" if applicant_message else "")
            + f"Open the document to approve or reject."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 🙋 Collaboration Request\n\n"
            f"**{applicant_name}** wants to collaborate on **{document_title}**.\n\n"
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
