from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TelegramLinkCodeRead(BaseModel):
    code: str
    expires_at: datetime
    ttl_seconds: int


class TelegramLinkStatusRead(BaseModel):
    linked: bool
    telegram_chat_id: Optional[str] = None
    telegram_user_id: Optional[str] = None
    chat_type: Optional[str] = None
