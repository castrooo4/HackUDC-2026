from datetime import datetime, timezone
import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session

from app.config import settings
from app.db.database import get_session
from app.models.user import User
from app.schemas.telegram import TelegramLinkCodeRead, TelegramLinkStatusRead
from app.service.auth_dependencies import get_current_user
from app.service.telegram_service import TelegramService

router = APIRouter(prefix="/telegram", tags=["telegram"])
telegram_service = TelegramService()


@router.post("/link-code", response_model=TelegramLinkCodeRead)
def create_link_code(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        code, expires_at = telegram_service.generate_link_code(session, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    ttl_seconds = max(0, int((expires_at - datetime.now(timezone.utc)).total_seconds()))
    return TelegramLinkCodeRead(code=code, expires_at=expires_at, ttl_seconds=ttl_seconds)


@router.get("/link", response_model=TelegramLinkStatusRead)
def get_link_status(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    link = telegram_service.get_link_for_user(session, current_user.id)
    if not link:
        return TelegramLinkStatusRead(linked=False)
    return TelegramLinkStatusRead(
        linked=True,
        telegram_chat_id=link.telegram_chat_id,
        telegram_user_id=link.telegram_user_id,
        chat_type=link.chat_type,
    )


@router.post("/webhook")
def telegram_webhook(
    payload: dict,
    x_telegram_bot_api_secret_token: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
    session: Session = Depends(get_session),
):
    _validate_webhook_secret(x_telegram_bot_api_secret_token)

    message = payload.get("message") or payload.get("edited_message")
    if not isinstance(message, dict):
        return {"ok": True, "handled": False, "reason": "unsupported_update"}

    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    if chat_id is None:
        return {"ok": True, "handled": False, "reason": "missing_chat_id"}

    chat_id_str = str(chat_id)
    from_data = message.get("from") or {}
    telegram_user_id = str(from_data["id"]) if from_data.get("id") is not None else None
    chat_type = str(chat.get("type") or "private")
    if chat_type != "private":
        return {"ok": True, "handled": False, "reason": "unsupported_chat_type"}

    text = str(message.get("text") or "").strip()
    start_code = telegram_service.extract_start_code(text) if text else None
    if start_code:
        try:
            link = telegram_service.consume_link_code(
                session,
                start_code,
                telegram_chat_id=chat_id_str,
                telegram_user_id=telegram_user_id,
                chat_type=chat_type,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        if not link:
            return {"ok": True, "handled": True, "linked": False, "reason": "invalid_or_expired_code"}
        return {"ok": True, "handled": True, "linked": True, "user_id": link.user_id}

    user_id = telegram_service.get_user_id_for_chat(session, chat_id_str)
    if not user_id:
        return {"ok": True, "handled": False, "reason": "chat_not_linked"}

    photos = message.get("photo") or []
    if isinstance(photos, list) and photos:
        selected = max(photos, key=lambda entry: int(entry.get("file_size") or 0))
        file_id = selected.get("file_id")
        if not file_id:
            return {"ok": True, "handled": False, "reason": "missing_photo_file_id"}

        try:
            raw_bytes, mime_type = telegram_service.download_telegram_file(str(file_id))
            item = telegram_service.create_image_note(
                session,
                user_id,
                raw_bytes,
                mime_type=mime_type,
                caption=message.get("caption"),
                telegram_file_id=str(file_id),
            )
            return {"ok": True, "handled": True, "item_id": item.id, "item_type": item.item_type.value}
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"No se pudo procesar imagen de Telegram: {exc}",
            ) from exc

    if text and not text.startswith("/"):
        item = telegram_service.create_text_note(session, user_id, text)
        return {"ok": True, "handled": True, "item_id": item.id, "item_type": item.item_type.value}

    return {"ok": True, "handled": False, "reason": "no_supported_content"}


def _validate_webhook_secret(secret_header: str | None) -> None:
    expected = settings.TELEGRAM_WEBHOOK_SECRET.strip()
    if not expected:
        return
    provided = (secret_header or "").strip()
    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Webhook de Telegram no autorizado")
