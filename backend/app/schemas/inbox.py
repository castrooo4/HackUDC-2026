from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.inbox_item import InboxStatus


class InboxCreate(BaseModel):
    source: str = "extension"
    title: Optional[str] = None
    content: str

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        title = value.strip()
        if not title:
            return None
        return title[:120]

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        content = value.strip()
        if not content:
            raise ValueError("content no puede estar vacío")
        return content


class InboxRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    source: str
    title: Optional[str]
    content: str
    status: InboxStatus


class InboxUpdate(BaseModel):
    source: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[InboxStatus] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        title = value.strip()
        if not title:
            return None
        return title[:120]

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        content = value.strip()
        if not content:
            raise ValueError("content no puede estar vacío")
        return content

    @model_validator(mode="after")
    def validate_not_empty_payload(self):
        if not any(
            value is not None for value in [self.source, self.title, self.content, self.status]
        ):
            raise ValueError("debes enviar al menos un campo para actualizar")
        return self
