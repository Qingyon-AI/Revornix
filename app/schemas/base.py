from datetime import datetime, timezone

from pydantic import BaseModel as PydanticBaseModel, ConfigDict, model_validator

MAX_INFINITE_SCROLL_LIMIT = 50
MAX_PAGE_SIZE = 100


def to_utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def to_utc_iso_z(value: datetime) -> str:
    return to_utc_datetime(value).isoformat().replace("+00:00", "Z")


class BaseModel(PydanticBaseModel):
    model_config = ConfigDict(
        json_encoders={
            datetime: to_utc_iso_z,
        },
        from_attributes=True,
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_pagination_fields(self):
        class_name = self.__class__.__name__
        if not class_name.endswith("Request"):
            return self

        if hasattr(self, "start"):
            start = getattr(self, "start")
            if start is not None and start < 0:
                raise ValueError("start must be greater than or equal to 0")

        if hasattr(self, "limit"):
            limit = getattr(self, "limit")
            if limit is not None:
                if limit <= 0:
                    raise ValueError("limit must be greater than 0")
                if limit > MAX_INFINITE_SCROLL_LIMIT:
                    raise ValueError(f"limit must be less than or equal to {MAX_INFINITE_SCROLL_LIMIT}")

        if hasattr(self, "page_num"):
            page_num = getattr(self, "page_num")
            if page_num is not None and page_num <= 0:
                raise ValueError("page_num must be greater than 0")

        if hasattr(self, "page"):
            page = getattr(self, "page")
            if page is not None and page < 0:
                raise ValueError("page must be greater than or equal to 0")

        if hasattr(self, "page_size"):
            page_size = getattr(self, "page_size")
            if page_size is not None:
                if page_size <= 0:
                    raise ValueError("page_size must be greater than 0")
                if page_size > MAX_PAGE_SIZE:
                    raise ValueError(f"page_size must be less than or equal to {MAX_PAGE_SIZE}")

        return self
