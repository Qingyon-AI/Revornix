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


class DocumentPodcastReadyNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='b6e3a8d2c5f147a9b1d4e7f3a2c5b8d6',
            name="Document Podcast Ready Template",
            name_zh="文档播客生成完成通知模版",
            description="This is a document podcast ready template",
            description_zh="这是一个文档播客生成完成的通知模板"
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

        link = f'/document/detail/{document_id}?tab=podcast'
        base_title = "Document Podcast Ready"
        plain_content = f"Podcast for document \"{document_title}\" is ready. Tap to listen."

        email_title = f"[{APP_BRAND}] Podcast for \"{document_title}\" is ready"
        email_html = (
            f"<h2 style='margin:0 0 12px'>Your document podcast is ready</h2>"
            f"<p>The podcast for <strong>{document_title}</strong> has finished generating.</p>"
            f"<p>Open the document to listen or download.</p>"
        )
        email_plain = (
            f"Your document podcast is ready.\n\n"
            f"Podcast for \"{document_title}\" finished generating. "
            f"Open the document to listen."
        )

        apple_title = "Podcast ready"
        apple_text = f"Podcast for \"{document_title}\" is ready."

        telegram_title = f"Podcast ready · {document_title}"
        telegram_text = (
            f"Podcast for \"{document_title}\" is ready.\n"
            f"Tap the link to listen."
        )

        feishu_title = make_card_title("🎙️", f"Podcast Ready · {document_title}")
        feishu_markdown = (
            f"Podcast for **{document_title}** has finished generating.\n\n"
            f"Open the document to listen or download."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 🎙️ Podcast Ready\n\n"
            f"Podcast for **{document_title}** has finished generating.\n\n"
            f"[Click to listen]({link})"
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
