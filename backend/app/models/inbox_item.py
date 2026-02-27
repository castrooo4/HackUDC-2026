from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class InboxStatus(str, Enum):
    PENDING = "PENDING"


class InboxItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    source: str = Field(default="extension", nullable=False)
    title: Optional[str] = Field(default=None, max_length=120)
    content: str = Field(nullable=False)
    status: InboxStatus = Field(default=InboxStatus.PENDING, nullable=False)
