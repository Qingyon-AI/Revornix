from pydantic import BaseModel
from pydantic.config import ConfigDict

class BaseResponseModel(BaseModel):
    model_config = ConfigDict(ser_json_exclude_none=True)
    
class SuccessResponse(BaseResponseModel):
    success: bool = True
    message: str | dict = "Success"
    code: int | None = 200
    
class ErrorResponse(BaseResponseModel):
    success: bool = False
    message: str = "Error"
    code: int | None = 400
    
class NormalResponse(BaseResponseModel):
    success: bool = True
    message: str = "Success"
    code: int | None = None