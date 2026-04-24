from datetime import date as date_type
from html import escape
from typing import cast

import crud
from data.sql.base import async_session_context
from notification.template.platform_message_builder import build_multi_platform_message
from protocol.notification_template import NotificationTemplate
from proxy.file_system_proxy import FileSystemProxy


class DailySummaryNotificationTemplate(NotificationTemplate):

    def __init__(self):
        super().__init__(
            uuid='8f5016dc375e447f82729df765b12847',
            name="Daily Summary Template",
            name_zh="每日总结模板",
            description="This is a daily summary template",
            description_zh="这是一个每日总结模板"
        )

    async def generate(
        self,
        params: dict | None
    ):
        if params is None:
            raise Exception("params is None")
        
        receiver_id = cast(int, params.get('receiver_id'))
        date = cast(date_type, params.get('date'))
        if receiver_id is None or date is None:
            raise Exception("params is not valid")

        section_md_file_name: str | None = None
        async with async_session_context() as db:
            db_user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=receiver_id
            )
            if db_user is None:
                raise Exception("The user who is about to send notification is not found")
            if db_user.default_user_file_system is None:
                raise Exception("The user who is about to send notification havn't set default user file system")

            db_section = await crud.section.get_section_by_user_and_date_async(
                db=db,
                user_id=receiver_id,
                date=date
            )
            if db_section is None or db_section.md_file_name is None:
                title = f"Daily Summary for {date.isoformat()}"
                plain_content = "No summary is available for today yet."
                return build_multi_platform_message(
                    title=title,
                    plain_content=plain_content,
                    email_html=(
                        "<p>No summary is available for today yet.</p>"
                        "<p>We will send another update once it is ready.</p>"
                    ),
                    email_plain=plain_content,
                    feishu_markdown="### Daily Summary\nNo summary is available for today yet.",
                    dingtalk_markdown="### Daily Summary\nNo summary is available for today yet.",
                    telegram_text=plain_content,
                    apple_text=plain_content,
                )
            section_md_file_name = db_section.md_file_name

        remote_file_service = await FileSystemProxy.create(
            user_id=receiver_id
        )
        if section_md_file_name is None:
            raise Exception("The section markdown file is missing")
        raw_markdown = await remote_file_service.get_file_content_by_file_path(
            file_path=section_md_file_name
        )
        markdown_content = raw_markdown.decode("utf-8") if isinstance(raw_markdown, bytes) else raw_markdown
        title = f"Daily Summary for {date.isoformat()}"
        plain_content = "Your daily summary is ready. Open the link to view the full report."
        email_html = (
            "<p>Your daily summary is ready.</p>"
            "<p>Open the link to view the full report.</p>"
            "<hr>"
            f"<pre style='white-space:pre-wrap;font-family:monospace'>{escape(markdown_content)}</pre>"
        )
        email_plain = f"{plain_content}\n\n{markdown_content}"
        markdown_body = f"### Daily Summary ({date.isoformat()})\n\n{markdown_content}"
        return build_multi_platform_message(
            title=title,
            plain_content=plain_content,
            link='/section/today',
            email_html=email_html,
            email_plain=email_plain,
            feishu_markdown=markdown_body,
            dingtalk_markdown=markdown_body,
            telegram_text=plain_content,
            apple_text=plain_content,
        )
