from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    message: str | dict = "Success"
    code: int | None = 200

class ErrorResponse(BaseModel):
    success: bool = False
    message: str = "Error"
    code: int | None = 400

class NormalResponse(BaseModel):
    success: bool
    message: str
    code: int
