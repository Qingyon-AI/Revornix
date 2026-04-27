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


class SectionPptReadyNotificationTemplate(NotificationTemplate):

    def __init__(
        self
    ):
        super().__init__(
            uuid='f9a4c8e2d5b14f6dab7c2d3e8f1a5b6c',
            name="Section PPT Ready Template",
            name_zh="专栏 PPT 生成完成通知模版",
            description="This is a section PPT ready template",
            description_zh="这是一个专栏 PPT 生成完成的通知模板"
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
        elif section_role == UserSectionRole.CREATOR:
            relation_phrase = "you created"
        else:
            raise Exception("user is not a member or creator of the section")

        link = f'/section/detail/{section_id}?tab=ppt'
        base_title = "Section PPT Ready"
        plain_content = f"PPT for section \"{section_title}\" that {relation_phrase} is ready. Tap to view."

        email_title = f"[{APP_BRAND}] PPT for \"{section_title}\" is ready"
        email_html = (
            f"<h2 style='margin:0 0 12px'>Your section PPT is ready</h2>"
            f"<p>The slides for <strong>{section_title}</strong> that {relation_phrase} have finished generating.</p>"
            f"<p>Open the section to view or download the .pptx.</p>"
        )
        email_plain = (
            f"Your section PPT is ready.\n\n"
            f"PPT for \"{section_title}\" ({relation_phrase}) finished generating. "
            f"Open the section to view or download."
        )

        apple_title = "PPT ready"
        apple_text = f"PPT for \"{section_title}\" is ready."

        telegram_title = f"PPT ready · {section_title}"
        telegram_text = (
            f"PPT for \"{section_title}\" ({relation_phrase}) is ready.\n"
            f"Tap the link to view."
        )

        feishu_title = make_card_title("📊", f"PPT Ready · {section_title}")
        feishu_markdown = (
            f"Slides for **{section_title}** that {relation_phrase} have finished generating.\n\n"
            f"Open the section to view or download the .pptx."
        )
        dingtalk_title = feishu_title
        dingtalk_markdown = (
            f"### 📊 PPT Ready\n\n"
            f"Slides for **{section_title}** that {relation_phrase} have finished generating.\n\n"
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
