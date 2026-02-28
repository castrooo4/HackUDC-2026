from dataclasses import dataclass
from typing import Optional


@dataclass(slots=True)
class IngestionResult:
    title: str
    content: str
    url: Optional[str]
    preview_base64: Optional[str]
    favicon_base64: Optional[str]
    mime_type: Optional[str]
    metadata_json: Optional[dict]
