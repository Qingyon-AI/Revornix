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


class DocumentCommentedNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='04d4219387d24a559f2f2a01382a99a5',
            name="Document Commented Template",
            name_zh="文档被评论通知模版",
            description="This is a document commented template",
            description_zh="这是一个文档被评论的通知模板"
        )

    async def generate(
        self,
        params: dict | None
    ):
        if params is None:
            raise Exception("params is None")

        receiver_id = cast(int, params.get('receiver_id'))
        document_id = cast(int, params.get('document_id'))
        comment_id = params.get('comment_id')

        if receiver_id is None or document_id is None:
            raise Exception(f"receiver_id or document_id is None, params: {params.items()}")

        async with async_session_context() as db:
            db_document = await crud.document.get_document_by_document_id_async(
                db=db,
                document_id=document_id,
            )
            if not db_document:
                raise Exception("document not found")

            document_title = db_document.title
            document_cover = db_document.cover
            document_creator_id = db_document.creator_id

        cover = None
        if document_cover is not None:
            cover = await get_remote_file_signed_url(
                user_id=document_creator_id,
                file_name=document_cover,
            )

        link = f'/document/detail/{document_id}?comment_id={comment_id}' if comment_id else f'/document/detail/{document_id}'
        base_title = "Document Commented"
        plain_content = f"Someone commented on document \"{document_title}\". Check it out."

        email_title = f"[{APP_BRAND}] New comment on \"{document_title}\""
        email_html = (
            f"<h2 style='margin:0 0 12px'>New comment on your document</h2>"
            f"<p>Someone left a new comment on <strong>{document_title}</strong>.</p>"
            f"<p>Open the document page to read and reply.</p>"
        )
        email_plain = (
            f"New comment on your document.\n\n"
            f"Someone commented on \"{document_title}\". "
            f"Open the document page to read and reply."
        )

        apple_title = "New comment"
        apple_text = f"New comment on \"{document_title}\"."

        telegram_title = f"New comment · {document_title}"
        telegram_text = (
            f"Someone commented on \"{document_title}\".\n"
            f"Tap the link to read and reply."
        )

        feishu_title = make_card_title("💬", f"New Comment · {document_title}")
        feishu_markdown = (
            f"Someone left a new comment on **{document_title}**.\n\n"
            f"Open the document page to read and reply."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 💬 New Comment\n\n"
            f"Someone commented on **{document_title}**.\n\n"
            f"[Click to read and reply]({link})"
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
