import telegram
from urllib.parse import urljoin

from config.base import base_url
from protocol.notification_tool import NotificationToolProtocol


class TelegramNotificationTool(NotificationToolProtocol):
    MAX_TEXT_LENGTH = 4096
    MAX_CAPTION_LENGTH = 1024

    def __init__(self):
        super().__init__(
            uuid="9abd6f1eced74095b2771a2f8edb650b",
            tool_name="Telegram Notification Tool",
            tool_name_zh="Telegram通知工具",
            channel_key="telegram",
        )

    def _resolve_notification_link(self, link: str | None) -> str | None:
        if link is None:
            return None

        normalized_link = link.strip()
        if not normalized_link:
            return None

        if normalized_link.startswith(("http://", "https://")):
            return normalized_link

        if normalized_link.startswith("/"):
            raw_base_url = base_url
            if raw_base_url is not None:
                normalized_base_url = raw_base_url.strip().strip("'\"")
                if normalized_base_url:
                    if not normalized_base_url.endswith("/"):
                        normalized_base_url += "/"
                    return urljoin(normalized_base_url, normalized_link.lstrip("/"))

        return normalized_link

    def _split_text_chunks(self, text: str, max_length: int) -> list[str]:
        content = text.strip()
        if not content:
            return []

        chunks: list[str] = []
        remaining = content
        while remaining:
            if len(remaining) <= max_length:
                chunks.append(remaining)
                break

            split_at = remaining.rfind("\n", 0, max_length)
            if split_at < max_length // 3:
                split_at = max_length

            chunk = remaining[:split_at].strip()
            if not chunk:
                chunk = remaining[:max_length]
                split_at = max_length

            chunks.append(chunk)
            remaining = remaining[split_at:].lstrip()

        return chunks

    async def send_notification(
        self,
        title: str,
        content: str | None = None,
        content_type: str | None = None,
        plain_content: str | None = None,
        cover: str | None = None,
        link: str | None = None
    ):
        source_config = self.get_source_config()
        target_config = self.get_target_config()
        if source_config is None or target_config is None:
            raise Exception("The source or target config of the notification is not set")

        bot_token = source_config.get("bot_token")
        if not bot_token:
            raise Exception("The bot_token of the notification is not set")
        
        chat_id = target_config.get("chat_id")
        if not chat_id:
            raise Exception("The chat_id of the notification is not set")
        
        bot = telegram.Bot(token=bot_token)
        normalized_title = title
        normalized_content = (content if content is not None else plain_content) or ""
        normalized_link = self._resolve_notification_link(link)

        summary_lines = [f"📢 {normalized_title}"]
        if normalized_link:
            summary_lines.append(f"View Detail: {normalized_link}")
        summary_text = "\n".join(summary_lines).strip()

        if cover:
            caption = summary_text
            if len(caption) > self.MAX_CAPTION_LENGTH:
                caption = caption[: self.MAX_CAPTION_LENGTH - 3].rstrip() + "..."

            await bot.send_photo(
                chat_id=chat_id,
                photo=cover,
                caption=caption
            )

            if normalized_content:
                for chunk in self._split_text_chunks(normalized_content, self.MAX_TEXT_LENGTH):
                    await bot.send_message(chat_id=chat_id, text=chunk)
            return

        text_parts = [summary_text]
        if normalized_content:
            text_parts.append(normalized_content)
        full_text = "\n\n".join(part for part in text_parts if part)
        for chunk in self._split_text_chunks(full_text, self.MAX_TEXT_LENGTH):
            await bot.send_message(chat_id=chat_id, text=chunk)
