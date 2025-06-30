import schemas
from typing import Protocol

class NotificationTemplate(Protocol):
    
    def __init__(self, 
                 template_name: str | None = None,
                 template_description: str | None = None,
                 template_version: str | None = None):
        self.template_name = template_name
        self.template_description = template_description
        self.template_version = template_version
        
    async def generate(self) -> schemas.notification.Message:
        raise NotImplementedError("Not implemented")