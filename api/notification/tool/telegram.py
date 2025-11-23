import telegram
from protocol.notification_tool import NotificationToolProtocol


class TelegramNotificationTool(NotificationToolProtocol):

    def escape_v2_text(self, text: str) -> str:
        """
        转义 Telegram MarkdownV2 文本内容需要的特殊字符
        用于普通文本（标题、正文等）
        """
        escape_chars = r"_*[]()~`>#+-=|{}.!"
        return "".join("\\" + c if c in escape_chars else c for c in text)

    def escape_v2_url(self, url: str) -> str:
        """
        转义 Telegram MarkdownV2 中作为链接 URL 部分的特殊字符
        文档要求：URL 里只需要转义 ')' 和 '\\'
        """
        return url.replace("\\", "\\\\").replace(")", "\\)")

    async def send_notification(
        self,
        title: str,
        content: str | None = None,
        cover: str | None = None,
        link: str | None = None
    ):
        if self.source is None or self.target is None:
            raise Exception("The source or target of the notification is not set")

        source_config = self.get_source_config()
        target_config = self.get_target_config()

        if source_config is None or target_config is None:
            raise Exception("The source or target config of the notification is not set")

        chat_id = target_config.get("chat_id")
        bot_token = source_config.get("bot_token")
        bot = telegram.Bot(token=bot_token)

        # ================== 构建 UI ==================
        parts: list[str] = []

        # 主标题行
        parts.append("📢 *通知中心*")
        parts.append("━━━━━━━━━━━━━━━")

        # 标题
        safe_title = self.escape_v2_text(title)
        parts.append(f"📝 *标题*\n{safe_title}")

        # 内容（可选）
        if content:
            safe_content = self.escape_v2_text(content)
            parts.append(f"💬 *内容*\n{safe_content}")

        # 链接（可选） -> 使用 [文本](URL) 形式
        if link:
            safe_label = self.escape_v2_text("点击查看")
            safe_url = self.escape_v2_url(link)
            parts.append(f"🔗 [{safe_label}]({safe_url})")

        parts.append("━━━━━━━━━━━━━━━")

        caption = "\n".join(parts)

        # ================== 发送消息 ==================
        if cover:
            # 有封面：图片 + caption（文本+链接）一起发送
            await bot.send_photo(
                chat_id=chat_id,
                photo=cover,           # 这里可以是图片 URL 或 file_id
                caption=caption,
                parse_mode="MarkdownV2"
            )
        else:
            # 没有封面：纯文本消息
            await bot.send_message(
                chat_id=chat_id,
                text=caption,
                parse_mode="MarkdownV2"
            )