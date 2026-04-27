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


class DocumentProcessCompletedNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='2a7d4f1c6b3e495a9c8d3f2e1b6a5d4c',
            name="Document Process Completed Template",
            name_zh="文档处理完成通知模版",
            description="This is a document process completed template",
            description_zh="这是一个文档处理流水线完成的通知模板"
        )

    async def generate(
        self,
        params: dict | None
    ):
        if params is None:
            raise Exception("params is None")

        receiver_id = cast(int, params.get('receiver_id'))
        document_id = cast(int, params.get('document_id'))

        if receiver_id is None or document_id is None:
            raise Exception(f"receiver_id or document_id is None, params: {params.items()}")

        async with async_session_context() as db:
            db_document = await crud.document.get_document_by_document_id_async(
                db=db,
                document_id=document_id,
            )
            if not db_document:
                raise Exception("document not found")
            if db_document.creator_id != receiver_id:
                raise Exception("receiver is not the document creator")

            document_title = db_document.title
            document_cover = db_document.cover
            document_creator_id = db_document.creator_id

        cover = None
        if document_cover is not None:
            cover = await get_remote_file_signed_url(
                user_id=document_creator_id,
                file_name=document_cover,
            )

        link = f'/document/detail/{document_id}'
        base_title = "Document Ready"
        plain_content = f"Document \"{document_title}\" has finished processing. Click to view."

        email_title = f"[{APP_BRAND}] \"{document_title}\" is ready"
        email_html = (
            f"<h2 style='margin:0 0 12px'>Your document is ready</h2>"
            f"<p>The document <strong>{document_title}</strong> has finished processing "
            f"(conversion, summary, embedding, tagging, graph).</p>"
            f"<p>Open it to read the summary or ask questions.</p>"
        )
        email_plain = (
            f"Your document is ready.\n\n"
            f"\"{document_title}\" has finished processing. "
            f"Open it to read the summary or ask questions."
        )

        apple_title = "Document ready"
        apple_text = f"\"{document_title}\" has finished processing."

        telegram_title = f"Document ready · {document_title}"
        telegram_text = (
            f"\"{document_title}\" has finished processing.\n"
            f"Tap the link to view."
        )

        feishu_title = make_card_title("📄", f"Document Ready · {document_title}")
        feishu_markdown = (
            f"**{document_title}** has finished processing.\n\n"
            f"Open the document to read the summary or ask questions."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 📄 Document Ready\n\n"
            f"**{document_title}** has finished processing.\n\n"
            f"[Click to view]({link})"
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
