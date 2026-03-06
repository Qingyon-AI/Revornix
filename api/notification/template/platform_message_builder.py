from __future__ import annotations

from html import escape

import schemas


def _to_html_paragraphs(text: str) -> str:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return ""
    return "".join(f"<p>{escape(line)}</p>" for line in lines)


def build_platform_variants(
    *,
    title: str,
    plain_content: str,
    link: str | None,
    cover: str | None,
    email_html: str | None = None,
    email_plain: str | None = None,
    feishu_markdown: str | None = None,
    dingtalk_markdown: str | None = None,
    telegram_text: str | None = None,
    apple_text: str | None = None,
    apple_sandbox_text: str | None = None,
) -> dict[str, schemas.notification.MessageVariant]:
    email_html_body = email_html if email_html is not None else _to_html_paragraphs(plain_content)
    email_plain_body = email_plain if email_plain is not None else plain_content
    feishu_body = feishu_markdown if feishu_markdown is not None else plain_content
    dingtalk_body = dingtalk_markdown if dingtalk_markdown is not None else feishu_body
    telegram_body = telegram_text if telegram_text is not None else plain_content
    apple_body = apple_text if apple_text is not None else plain_content
    apple_sandbox_body = apple_sandbox_text if apple_sandbox_text is not None else apple_body

    return {
        "email": schemas.notification.MessageVariant(
            title=title,
            content=email_html_body,
            content_type="html",
            plain_content=email_plain_body,
            link=link,
            cover=cover,
        ),
        "apple": schemas.notification.MessageVariant(
            title=title,
            content=apple_body,
            content_type="plain",
            link=link,
            cover=cover,
        ),
        "apple_sandbox": schemas.notification.MessageVariant(
            title=title,
            content=apple_sandbox_body,
            content_type="plain",
            link=link,
            cover=cover,
        ),
        "telegram": schemas.notification.MessageVariant(
            title=title,
            content=telegram_body,
            content_type="plain",
            link=link,
            cover=cover,
        ),
        "feishu": schemas.notification.MessageVariant(
            title=title,
            content=feishu_body,
            content_type="markdown",
            link=link,
            cover=cover,
        ),
        "dingtalk": schemas.notification.MessageVariant(
            title=title,
            content=dingtalk_body,
            content_type="markdown",
            link=link,
            cover=cover,
        ),
    }


def build_multi_platform_message(
    *,
    title: str,
    plain_content: str,
    link: str | None = None,
    cover: str | None = None,
    email_html: str | None = None,
    email_plain: str | None = None,
    feishu_markdown: str | None = None,
    dingtalk_markdown: str | None = None,
    telegram_text: str | None = None,
    apple_text: str | None = None,
    apple_sandbox_text: str | None = None,
) -> schemas.notification.Message:
    return schemas.notification.Message(
        title=title,
        content=plain_content,
        content_type="plain",
        link=link,
        cover=cover,
        variants=build_platform_variants(
            title=title,
            plain_content=plain_content,
            link=link,
            cover=cover,
            email_html=email_html,
            email_plain=email_plain,
            feishu_markdown=feishu_markdown,
            dingtalk_markdown=dingtalk_markdown,
            telegram_text=telegram_text,
            apple_text=apple_text,
            apple_sandbox_text=apple_sandbox_text,
        ),
    )
