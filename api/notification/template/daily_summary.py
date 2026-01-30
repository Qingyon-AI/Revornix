from datetime import date as date_type
from typing import cast

import crud
import schemas
from data.sql.base import SessionLocal
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
        db = SessionLocal()
        user_id = cast(int, params.get('user_id'))
        date = cast(date_type, params.get('date'))
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user who is about to send notification is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user who is about to send notification havn't set default user file system")

        db_section = crud.section.get_section_by_user_and_date(
            db=db,
            user_id=user_id,
            date=date
        )
        if db_section is None or db_section.md_file_name is None:
            return schemas.notification.Message(
                title=f"Daily Summary Of {date.isoformat()}",
                content="No Summary Today For Now"
            )

        remote_file_service = await FileSystemProxy.create(
            user_id=user_id
        )
        markdown_content = await remote_file_service.get_file_content_by_file_path(
            file_path=db_section.md_file_name
        )
        db.close()
        return schemas.notification.Message(
            title=f"Daily Summary Of {date.isoformat()}",
            content=markdown_content,
            link='/section/today'
        )
