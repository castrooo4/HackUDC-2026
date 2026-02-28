from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.inbox_item import InboxItemType, InboxStatus


class InboxCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "source": "extension",
                    "item_type": "TEXT",
                    "content": "Nota rapida para revisar arquitectura del frontend",
                },
                {
                    "source": "extension",
                    "item_type": "YOUTUBE",
                    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                },
                {
                    "source": "extension",
                    "item_type": "IMAGE",
                    "url": "https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg",
                },
                {
                    "source": "extension",
                    "item_type": "PDF",
                    "url": "https://arxiv.org/pdf/1706.03762.pdf",
                },
                {
                    "source": "extension",
                    "item_type": "WEB",
                    "url": "https://example.com",
                },
            ]
        }
    )

    source: str = Field(default="extension", description="Origen de la captura. Ej: extension, web")
    item_type: InboxItemType = Field(
        default=InboxItemType.TEXT,
        description="Tipo de entrada: TEXT, YOUTUBE, IMAGE, PDF, WEB",
    )
    title: Optional[str] = Field(default=None, description="Titulo opcional. Si no llega, se autogenera")
    content: Optional[str] = Field(
        default=None,
        description="Texto principal. Obligatorio para TEXT. Opcional para otros tipos",
    )
    url: Optional[str] = Field(
        default=None,
        description="URL del recurso. Obligatorio para YOUTUBE y WEB. Opcional para IMAGE/PDF",
    )
    file_base64: Optional[str] = Field(
        default=None,
        description="Archivo en base64 (data URL o payload base64). Usado para IMAGE/PDF",
    )
    mime_type: Optional[str] = Field(
        default=None,
        description="MIME type opcional, util cuando envias file_base64",
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned[:120] if cleaned else None

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned if cleaned else None

    @field_validator("url", "file_base64", "mime_type")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned if cleaned else None

    @model_validator(mode="after")
    def validate_payload_by_type(self):
        if self.item_type == InboxItemType.TEXT:
            if not self.content:
                raise ValueError("content es obligatorio para item_type=TEXT")
            return self

        if self.item_type in {InboxItemType.YOUTUBE, InboxItemType.WEB}:
            if not self.url:
                raise ValueError("url es obligatorio para YOUTUBE y WEB")
            return self

        if self.item_type in {InboxItemType.IMAGE, InboxItemType.PDF}:
            if not self.url and not self.file_base64:
                raise ValueError("debes enviar url o file_base64 para IMAGE/PDF")
            return self

        return self


class InboxRead(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "created_at": "2026-02-28T10:15:00.000000",
                "source": "extension",
                "item_type": "YOUTUBE",
                "title": "How to build a FastAPI backend",
                "content": "",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "preview_base64": "data:image/jpeg;base64,/9j/4AAQ...",
                "favicon_base64": None,
                "mime_type": "video/youtube",
                "metadata_json": {"video_id": "dQw4w9WgXcQ", "preview_kind": "youtube"},
                "status": "PENDING",
            }
        },
    )

    id: int
    created_at: datetime
    user_id: int
    source: str
    item_type: InboxItemType
    title: Optional[str]
    content: str
    url: Optional[str]
    preview_base64: Optional[str]
    favicon_base64: Optional[str]
    mime_type: Optional[str]
    metadata_json: Optional[dict]
    status: InboxStatus


class InboxUpdate(BaseModel):
    source: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[InboxStatus] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned[:120] if cleaned else None

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content no puede estar vacio")
        return cleaned

    @model_validator(mode="after")
    def validate_not_empty_payload(self):
        if not any(
            value is not None for value in [self.source, self.title, self.content, self.status]
        ):
            raise ValueError("debes enviar al menos un campo para actualizar")
        return self
