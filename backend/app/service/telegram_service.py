import hashlib
import mimetypes
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from sqlmodel import Session, select

from app.config import settings
from app.models.inbox_item import InboxItem, InboxStatus
from app.models.telegram_link import TelegramLink
from app.models.telegram_link_code import TelegramLinkCode
from app.schemas.inbox import InboxCreate
from app.service.directory_service import DirectoryService
from app.service.inbox_ingest_service import InboxIngestionService
from app.utils.preview import to_data_url

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class TelegramService:
    def __init__(self):
        self.ingestion_service = InboxIngestionService()
        self.directory_service = DirectoryService()

    def generate_link_code(self, session: Session, user_id: int) -> tuple[str, datetime]:
        now = datetime.now(timezone.utc)

        pending_codes = session.exec(
            select(TelegramLinkCode).where(
                TelegramLinkCode.user_id == user_id,
                TelegramLinkCode.consumed_at.is_(None),
            )
        ).all()
        for pending in pending_codes:
            pending.consumed_at = now
            session.add(pending)

        ttl = max(1, int(settings.TELEGRAM_LINK_CODE_TTL_MINUTES))
        expires_at = now + timedelta(minutes=ttl)
        code = ""
        code_hash = ""
        for _ in range(6):
            candidate = self._build_link_code()
            candidate_hash = self._hash_code(candidate)
            already_exists = session.exec(
                select(TelegramLinkCode).where(TelegramLinkCode.code_hash == candidate_hash)
            ).first()
            if not already_exists:
                code = candidate
                code_hash = candidate_hash
                break
        if not code:
            raise ValueError("No se pudo generar un codigo de vinculacion unico")

        link_code = TelegramLinkCode(
            user_id=user_id,
            code_hash=code_hash,
            expires_at=expires_at,
        )
        session.add(link_code)
        session.commit()
        return code, expires_at

    def consume_link_code(
        self,
        session: Session,
        raw_code: str,
        *,
        telegram_chat_id: str,
        telegram_user_id: Optional[str],
        chat_type: str,
    ) -> TelegramLink | None:
        code_hash = self._hash_code(raw_code)
        now = datetime.now(timezone.utc)
        code_row = session.exec(
            select(TelegramLinkCode).where(
                TelegramLinkCode.code_hash == code_hash,
                TelegramLinkCode.consumed_at.is_(None),
                TelegramLinkCode.expires_at >= now,
            )
        ).first()
        if not code_row:
            return None

        existing_by_chat = session.exec(
            select(TelegramLink).where(
                TelegramLink.telegram_chat_id == telegram_chat_id,
                TelegramLink.is_active.is_(True),
            )
        ).first()
        if existing_by_chat and existing_by_chat.user_id != code_row.user_id:
            raise ValueError("Este chat ya esta vinculado a otra cuenta")

        existing_by_user = session.exec(
            select(TelegramLink).where(
                TelegramLink.user_id == code_row.user_id,
            )
        ).first()

        link = existing_by_user or existing_by_chat
        if not link:
            link = TelegramLink(
                user_id=code_row.user_id,
                telegram_chat_id=telegram_chat_id,
                telegram_user_id=telegram_user_id,
                chat_type=chat_type or "private",
                is_active=True,
            )

        link.user_id = code_row.user_id
        link.telegram_chat_id = telegram_chat_id
        link.telegram_user_id = telegram_user_id
        link.chat_type = chat_type or "private"
        link.is_active = True

        code_row.consumed_at = now
        session.add(code_row)
        session.add(link)
        session.commit()
        session.refresh(link)
        return link

    def get_link_for_user(self, session: Session, user_id: int) -> TelegramLink | None:
        return session.exec(
            select(TelegramLink).where(
                TelegramLink.user_id == user_id,
                TelegramLink.is_active.is_(True),
            )
        ).first()

    def get_user_id_for_chat(self, session: Session, telegram_chat_id: str) -> int | None:
        link = session.exec(
            select(TelegramLink).where(
                TelegramLink.telegram_chat_id == telegram_chat_id,
                TelegramLink.is_active.is_(True),
            )
        ).first()
        return link.user_id if link else None

    def create_text_note(self, session: Session, user_id: int, content: str) -> InboxItem:
        payload = InboxCreate(
            source="telegram",
            item_type="TEXT",
            content=content,
        )
        return self._create_inbox_item(session, user_id, payload)

    def create_image_note(
        self,
        session: Session,
        user_id: int,
        raw_bytes: bytes,
        *,
        mime_type: Optional[str],
        caption: Optional[str],
        telegram_file_id: Optional[str],
    ) -> InboxItem:
        effective_mime = mime_type or "image/jpeg"
        payload = InboxCreate(
            source="telegram",
            item_type="IMAGE",
            content=(caption or "").strip() or None,
            file_base64=to_data_url(raw_bytes, effective_mime),
            mime_type=effective_mime,
        )
        item = self._create_inbox_item(session, user_id, payload)
        metadata = dict(item.metadata_json or {})
        if telegram_file_id:
            metadata["telegram_file_id"] = telegram_file_id
            item.metadata_json = metadata
            session.add(item)
            session.commit()
            session.refresh(item)
        return item

    def download_telegram_file(self, file_id: str) -> tuple[bytes, str]:
        if not settings.TELEGRAM_BOT_TOKEN.strip():
            raise ValueError("TELEGRAM_BOT_TOKEN no configurado")

        token = settings.TELEGRAM_BOT_TOKEN.strip()
        metadata_res = requests.get(
            f"https://api.telegram.org/bot{token}/getFile",
            params={"file_id": file_id},
            timeout=10,
        )
        metadata_res.raise_for_status()
        metadata_payload = metadata_res.json()
        file_path = (metadata_payload.get("result") or {}).get("file_path")
        if not file_path:
            raise ValueError("No se pudo resolver file_path de Telegram")

        file_res = requests.get(
            f"https://api.telegram.org/file/bot{token}/{file_path}",
            timeout=15,
        )
        file_res.raise_for_status()

        content_type = (file_res.headers.get("content-type", "").split(";")[0] or "").strip()
        guessed_type, _ = mimetypes.guess_type(file_path)
        mime_type = content_type or guessed_type or "image/jpeg"
        return file_res.content, mime_type

    def extract_start_code(self, text: str) -> str | None:
        normalized = text.strip()
        if not normalized:
            return None
        match = re.match(r"^/start(?:@\w+)?\s+(.+)$", normalized, flags=re.IGNORECASE)
        if not match:
            return None
        code = match.group(1).strip().split()[0]
        return code if code else None

    def _create_inbox_item(self, session: Session, user_id: int, payload: InboxCreate) -> InboxItem:
        processed = self.ingestion_service.process(payload)
        item = InboxItem(
            user_id=user_id,
            source=payload.source,
            item_type=payload.item_type,
            title=processed.title,
            content=processed.content,
            url=processed.url,
            preview_base64=processed.preview_base64,
            favicon_base64=processed.favicon_base64,
            mime_type=processed.mime_type,
            metadata_json=processed.metadata_json,
            status=InboxStatus.PENDING,
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        return self.directory_service.suggest_directory_for_item(session, user_id, item)

    def _build_link_code(self) -> str:
        raw = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(10))
        return f"RMT-{raw[:5]}-{raw[5:]}"

    def _hash_code(self, raw_code: str) -> str:
        normalized = raw_code.strip().upper()
        pepper = settings.JWT_SECRET_KEY or "telegram-link-pepper"
        digest = hashlib.sha256(f"{pepper}:{normalized}".encode("utf-8")).hexdigest()
        return digest
