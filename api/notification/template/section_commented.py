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


class SectionCommentedNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='1ba024dfd7c249d8a09bb873dca708e6',
            name="Section Commented Template",
            name_zh="专栏被评论通知模版",
            description="This is a section commented template",
            description_zh="这是一个专栏被评论的通知模板"
        )

    async def generate(
        self,
        params: dict | None
    ):
        if params is None:
            raise Exception("params is None")

        receiver_id = cast(int, params.get('receiver_id'))
        section_id = cast(int, params.get('section_id'))
        comment_id = params.get('comment_id')

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

        link = f'/section/detail/{section_id}?comment_id={comment_id}' if comment_id else f'/section/detail/{section_id}'
        base_title = "Section Commented"
        plain_content = f"Someone commented on section \"{section_title}\" that {relation_phrase}. Check it out."

        email_title = f"[{APP_BRAND}] New comment on \"{section_title}\""
        email_html = (
            f"<h2 style='margin:0 0 12px'>New comment on your section</h2>"
            f"<p>Someone left a new comment on <strong>{section_title}</strong> that {relation_phrase}.</p>"
            f"<p>Open the section page to read and reply.</p>"
        )
        email_plain = (
            f"New comment on your section.\n\n"
            f"Someone commented on \"{section_title}\" ({relation_phrase}). "
            f"Open the section page to read and reply."
        )

        apple_title = "New comment"
        apple_text = f"New comment on \"{section_title}\"."

        telegram_title = f"New comment · {section_title}"
        telegram_text = (
            f"Someone commented on \"{section_title}\" ({relation_phrase}).\n"
            f"Tap the link to read and reply."
        )

        feishu_title = make_card_title("💬", f"New Comment · {section_title}")
        feishu_markdown = (
            f"Someone left a new comment on **{section_title}** that {relation_phrase}.\n\n"
            f"Open the section page to read and reply."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 💬 New Comment\n\n"
            f"Someone commented on **{section_title}** that {relation_phrase}.\n\n"
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
