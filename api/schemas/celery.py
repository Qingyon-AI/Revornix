from pydantic import BaseModel

class TaskStatus(BaseModel):
    status: str
    result: str | None = None
    error: str | None = None