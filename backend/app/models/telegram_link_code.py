from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class TelegramLinkCode(SQLModel, table=True):
    __tablename__ = "telegram_link_code"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    user_id: int = Field(nullable=False, foreign_key="user.id", index=True)
    code_hash: str = Field(nullable=False, max_length=64, index=True, unique=True)
    expires_at: datetime = Field(nullable=False, index=True)
    consumed_at: Optional[datetime] = Field(default=None, nullable=True)
