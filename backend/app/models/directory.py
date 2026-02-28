from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class Directory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    user_id: int = Field(nullable=False, foreign_key="user.id", index=True)
    name: str = Field(nullable=False, max_length=60)
    parent_id: Optional[int] = Field(default=None, nullable=True, foreign_key="directory.id", index=True)
