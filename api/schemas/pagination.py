from typing import Generic, TypeVar
from pydantic import BaseModel

# 定义一个泛型类型变量
T = TypeVar("T")

class NormalInifiniteScrollPagnitionSearch(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10

class Pagination(BaseModel, Generic[T]):
    total_elements: int
    current_page_elements: int
    total_pages: int
    page_num: int
    page_size: int
    elements: list[T]

class PageableRequest(BaseModel):
    page_num: int
    page_size: int
    
class InifiniteScrollPagnition(BaseModel, Generic[T]):
    total: int 
    start: int | None = None
    limit: int
    has_more: bool
    elements: list[T]
    next_start: int | None = None