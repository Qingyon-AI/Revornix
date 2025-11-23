import telegram
from protocol.notification_tool import NotificationToolProtocol

class TelegramNotificationTool(NotificationToolProtocol):

    def escape_markdown_v2(
        self,
        text: str
    ) -> str:
        """
        转义 Telegram MarkdownV2 需要的特殊字符
        """
        escape_chars = r"_*[]()~`>#+-=|{}.!"
        result = ""
        for char in text:
            if char in escape_chars:
                result += "\\" + char
            else:
                result += char
        return result

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

        chat_id = target_config.get('chat_id')
        bot_token = source_config.get('bot_token')

        bot = telegram.Bot(token=bot_token)

        text = f"""
        # {title}
        """
        
        if content is not None:
            text += f"""
            ## {content}
            """
        
        if link is not None:
            text += f"""
            [Link]({link})
            """
            
        if cover is not None:
            text += f"""
            ![Cover]({cover})
            """

        text = self.escape_markdown_v2(text)
        
        await bot.send_message(
            chat_id=chat_id, 
            text=text,
            parse_mode='MarkdownV2'
        )