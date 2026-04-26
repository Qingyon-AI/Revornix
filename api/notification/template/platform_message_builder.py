from __future__ import annotations

from html import escape

import schemas


APP_BRAND = "Revornix"


def _to_html_paragraphs(text: str) -> str:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return ""
    return "".join(f"<p>{escape(line)}</p>" for line in lines)


def _truncate(text: str, max_length: int) -> str:
    text = text.strip()
    if len(text) <= max_length:
        return text
    return text[: max(0, max_length - 1)].rstrip() + "…"


def make_email_title(title: str) -> str:
    """Subject style: branded prefix + descriptive title."""
    base = title.strip()
    if base.startswith(f"[{APP_BRAND}]"):
        return base
    return f"[{APP_BRAND}] {base}"


def make_apple_title(title: str) -> str:
    """APNs lockscreen style: short, no emoji, no brand (app already branded)."""
    return _truncate(title.strip(), 30)


def make_telegram_title(title: str) -> str:
    """Telegram tool already prefixes 📢; keep title short and emoji-free."""
    return _truncate(title.strip(), 60)


def make_card_title(emoji: str, title: str) -> str:
    """Feishu / DingTalk card header: emoji + concise title."""
    base = title.strip()
    if emoji:
        return f"{emoji} {base}"
    return base


def build_platform_variants(
    *,
    title: str,
    plain_content: str,
    link: str | None,
    cover: str | None,
    email_title: str | None = None,
    email_html: str | None = None,
    email_plain: str | None = None,
    feishu_title: str | None = None,
    feishu_markdown: str | None = None,
    dingtalk_title: str | None = None,
    dingtalk_markdown: str | None = None,
    telegram_title: str | None = None,
    telegram_text: str | None = None,
    apple_title: str | None = None,
    apple_text: str | None = None,
    apple_sandbox_title: str | None = None,
    apple_sandbox_text: str | None = None,
) -> dict[str, schemas.notification.MessageVariant]:
    email_html_body = email_html if email_html is not None else _to_html_paragraphs(plain_content)
    email_plain_body = email_plain if email_plain is not None else plain_content
    feishu_body = feishu_markdown if feishu_markdown is not None else plain_content
    dingtalk_body = dingtalk_markdown if dingtalk_markdown is not None else feishu_body
    telegram_body = telegram_text if telegram_text is not None else plain_content
    apple_body = apple_text if apple_text is not None else plain_content
    apple_sandbox_body = apple_sandbox_text if apple_sandbox_text is not None else apple_body

    resolved_email_title = email_title if email_title is not None else make_email_title(title)
    resolved_apple_title = apple_title if apple_title is not None else make_apple_title(title)
    resolved_apple_sandbox_title = (
        apple_sandbox_title if apple_sandbox_title is not None else resolved_apple_title
    )
    resolved_telegram_title = (
        telegram_title if telegram_title is not None else make_telegram_title(title)
    )
    resolved_feishu_title = feishu_title if feishu_title is not None else title
    resolved_dingtalk_title = dingtalk_title if dingtalk_title is not None else resolved_feishu_title

    return {
        "email": schemas.notification.MessageVariant(
            title=resolved_email_title,
            content=email_html_body,
            content_type="html",
            plain_content=email_plain_body,
            link=link,
            cover=cover,
        ),
        "apple": schemas.notification.MessageVariant(
            title=resolved_apple_title,
            content=apple_body,
            content_type="plain",
            link=link,
            cover=cover,
        ),
        "apple_sandbox": schemas.notification.MessageVariant(
            title=resolved_apple_sandbox_title,
            content=apple_sandbox_body,
            content_type="plain",
            link=link,
            cover=cover,
        ),
        "telegram": schemas.notification.MessageVariant(
            title=resolved_telegram_title,
            content=telegram_body,
            content_type="plain",
            link=link,
            cover=cover,
        ),
        "feishu": schemas.notification.MessageVariant(
            title=resolved_feishu_title,
            content=feishu_body,
            content_type="markdown",
            link=link,
            cover=cover,
        ),
        "dingtalk": schemas.notification.MessageVariant(
            title=resolved_dingtalk_title,
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
    email_title: str | None = None,
    email_html: str | None = None,
    email_plain: str | None = None,
    feishu_title: str | None = None,
    feishu_markdown: str | None = None,
    dingtalk_title: str | None = None,
    dingtalk_markdown: str | None = None,
    telegram_title: str | None = None,
    telegram_text: str | None = None,
    apple_title: str | None = None,
    apple_text: str | None = None,
    apple_sandbox_title: str | None = None,
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
            email_title=email_title,
            email_html=email_html,
            email_plain=email_plain,
            feishu_title=feishu_title,
            feishu_markdown=feishu_markdown,
            dingtalk_title=dingtalk_title,
            dingtalk_markdown=dingtalk_markdown,
            telegram_title=telegram_title,
            telegram_text=telegram_text,
            apple_title=apple_title,
            apple_text=apple_text,
            apple_sandbox_title=apple_sandbox_title,
            apple_sandbox_text=apple_sandbox_text,
        ),
    )
