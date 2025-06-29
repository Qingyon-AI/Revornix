import schemas
from typing import Protocol

class NotifyProtocol(Protocol):
    
    def __init__(self, 
                 notify_name: str | None = None, 
                 notify_version: str | None = None, 
                 notify_description: str | None = None, 
                 source: schemas.notification.NotificationSourceDetail | None = None, 
                 target: schemas.notification.NotificationTargetDetail | None = None):
        self.notify_name = notify_name
        self.notify_version = notify_version
        self.notify_description = notify_description
        self.source = source
        self.target = target
        
    def send_notification(self, message: schemas.notification.Message) -> bool:
        raise NotImplementedError("Method not implemented")