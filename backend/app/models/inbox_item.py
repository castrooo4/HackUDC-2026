from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class InboxStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    ORGANIZED = "ORGANIZED"


class InboxItemType(str, Enum):
    TEXT = "TEXT"
    YOUTUBE = "YOUTUBE"
    IMAGE = "IMAGE"
    PDF = "PDF"
    WEB = "WEB"


class InboxItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    user_id: int = Field(nullable=False, foreign_key="user.id", index=True)
    directory_id: Optional[int] = Field(default=None, nullable=True, foreign_key="directory.id", index=True)
    source: str = Field(default="extension", nullable=False)
    item_type: InboxItemType = Field(default=InboxItemType.TEXT, nullable=False, max_length=20)
    url: Optional[str] = Field(default=None, nullable=True)
    location_lat: Optional[float] = Field(default=None, nullable=True, index=True)
    location_lon: Optional[float] = Field(default=None, nullable=True, index=True)
    location_city: Optional[str] = Field(default=None, nullable=True, index=True, max_length=120)
    title: Optional[str] = Field(default=None, max_length=120)
    content: str = Field(default="", nullable=False)
    preview_base64: Optional[str] = Field(default=None, nullable=True)
    favicon_base64: Optional[str] = Field(default=None, nullable=True)
    mime_type: Optional[str] = Field(default=None, nullable=True, max_length=120)
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON, nullable=True))
    status: InboxStatus = Field(default=InboxStatus.PENDING, nullable=False)
