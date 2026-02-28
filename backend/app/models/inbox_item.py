from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class InboxStatus(str, Enum):
    PENDING = "PENDING"


class InboxItemType(str, Enum):
    TEXT = "TEXT"
    YOUTUBE = "YOUTUBE"
    IMAGE = "IMAGE"
    PDF = "PDF"
    WEB = "WEB"


class InboxItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    source: str = Field(default="extension", nullable=False)
    item_type: InboxItemType = Field(default=InboxItemType.TEXT, nullable=False, max_length=20)
    url: Optional[str] = Field(default=None, nullable=True)
    title: Optional[str] = Field(default=None, max_length=120)
    content: str = Field(default="", nullable=False)
    preview_base64: Optional[str] = Field(default=None, nullable=True)
    favicon_base64: Optional[str] = Field(default=None, nullable=True)
    mime_type: Optional[str] = Field(default=None, nullable=True, max_length=120)
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON, nullable=True))
    status: InboxStatus = Field(default=InboxStatus.PENDING, nullable=False)
