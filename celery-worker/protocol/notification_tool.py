import crud
import schemas
import json
from typing import Protocol
from data.sql.base import SessionLocal

class NotificationToolProtocol(Protocol):

    source: schemas.notification.UserNotificationSource | None
    target: schemas.notification.UserNotificationTarget | None

    def set_source(
        self, 
        source_id: int
    ):
        db = SessionLocal()
        db_notification_source = crud.notification.get_user_notification_source_by_user_notification_source_id(
            db=db,
            user_notification_source_id=source_id
        )
        if db_notification_source is None:
            raise schemas.error.CustomException(message="notification source not found", code=404)
        self.source = db_notification_source

    def set_target(self, target_id: int):
        db = SessionLocal()
        db_notification_target = crud.notification.get_user_notification_target_by_user_notification_target_id(
            db=db,
            user_notification_target_id=target_id
        )
        if db_notification_target is None:
            raise schemas.error.CustomException(message="notification target not found", code=404)
        self.target = db_notification_target

    def get_source_config(self):
        config = None
        if self.source is None:
            raise Exception("notification source not found")
        if self.source.config_json:
            config = json.loads(self.source.config_json)
        return config

    def get_target_config(self):
        config = None
        if self.target is None:
            raise Exception("notification target not found")
        if self.target.config_json:
            config = json.loads(self.target.config_json)
        return config

    async def send_notification(
        self, 
        title: str,
        content: str | None = None,
        cover: str | None = None,
        link: str | None = None
    ):
        raise NotImplementedError("Method not implemented")