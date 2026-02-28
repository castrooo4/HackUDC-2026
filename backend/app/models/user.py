from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    email: str = Field(nullable=False, unique=True, index=True, max_length=255)
    full_name: Optional[str] = Field(default=None, nullable=True, max_length=120)
    password_hash: str = Field(nullable=False, max_length=255)
    is_active: bool = Field(default=True, nullable=False)
