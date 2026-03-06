from datetime import datetime, timezone

from pydantic import BaseModel as PydanticBaseModel, ConfigDict


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
