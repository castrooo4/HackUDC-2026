from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class TelegramLink(SQLModel, table=True):
    __tablename__ = "telegram_link"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    user_id: int = Field(nullable=False, foreign_key="user.id", index=True, unique=True)
    telegram_user_id: Optional[str] = Field(default=None, nullable=True, max_length=64, index=True)
    telegram_chat_id: str = Field(nullable=False, max_length=64, index=True, unique=True)
    chat_type: str = Field(default="private", nullable=False, max_length=24)
    is_active: bool = Field(default=True, nullable=False)
