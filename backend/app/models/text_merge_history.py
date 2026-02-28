from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class TextMergeHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    reverted_at: Optional[datetime] = Field(default=None, nullable=True)

    user_id: int = Field(nullable=False, foreign_key="user.id", index=True)
    source_item_id: int = Field(nullable=False, foreign_key="inboxitem.id", index=True)
    target_item_id: int = Field(nullable=False, foreign_key="inboxitem.id", index=True)

    preview_markdown: str = Field(default="", nullable=False)
    snapshot_target_title: Optional[str] = Field(default=None, max_length=120)
    snapshot_target_content: str = Field(default="", nullable=False)
