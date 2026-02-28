from urllib.parse import parse_qs, urljoin, urlparse

import fitz
import requests
from bs4 import BeautifulSoup

from app.models.inbox_item import InboxItemType
from app.schemas.inbox import InboxCreate
from app.utils.preview import (
    decode_base64_payload,
    generate_title_from_text,
    guess_mime_type_from_url,
    optimize_image_to_preview,
    truncate_title,
)


class InboxIngestionService:
    def __init__(self, timeout_seconds: int = 8):
        self.timeout_seconds = timeout_seconds

    def process(self, payload: InboxCreate) -> dict:
        if payload.item_type == InboxItemType.TEXT:
            return self._process_text(payload)
        if payload.item_type == InboxItemType.YOUTUBE:
            return self._process_youtube(payload)
        if payload.item_type == InboxItemType.IMAGE:
            return self._process_image(payload)
        if payload.item_type == InboxItemType.PDF:
            return self._process_pdf(payload)
        if payload.item_type == InboxItemType.WEB:
            return self._process_web(payload)
        return self._process_text(payload)

    def _process_text(self, payload: InboxCreate) -> dict:
        content = payload.content or ""
        title = payload.title or generate_title_from_text(content)
        return {
            "title": title,
            "content": content,
            "url": payload.url,
            "preview_base64": None,
            "favicon_base64": None,
            "mime_type": "text/plain",
            "metadata_json": {"preview_kind": "text"},
        }

    def _process_youtube(self, payload: InboxCreate) -> dict:
        url = payload.url or ""
        video_id = self._extract_youtube_video_id(url)
        title = payload.title
        thumbnail_data_url = None
        metadata: dict = {"video_id": video_id, "preview_kind": "youtube"}

        try:
            oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
            response = requests.get(oembed_url, timeout=self.timeout_seconds)
            response.raise_for_status()
            data = response.json()
            title = title or truncate_title(data.get("title", ""))
            thumbnail_url = data.get("thumbnail_url")
            metadata["author_name"] = data.get("author_name")
            if thumbnail_url:
                thumb_response = requests.get(thumbnail_url, timeout=self.timeout_seconds)
                thumb_response.raise_for_status()
                optimized = optimize_image_to_preview(
                    thumb_response.content,
                    max_width=480,
                    max_height=270,
                    output_format="JPEG",
                    quality=66,
                )
                thumbnail_data_url = optimized["data_url"]
                metadata["thumbnail_size"] = {
                    "original_width": optimized["original_width"],
                    "original_height": optimized["original_height"],
                    "preview_width": optimized["preview_width"],
                    "preview_height": optimized["preview_height"],
                    "preview_bytes": optimized["preview_bytes"],
                }
                metadata["thumbnail_url"] = thumbnail_url
        except Exception:
            pass

        if not title:
            title = payload.title or f"YouTube video {video_id or ''}".strip()
        return {
            "title": title,
            "content": payload.content or "",
            "url": url,
            "preview_base64": thumbnail_data_url,
            "favicon_base64": None,
            "mime_type": "video/youtube",
            "metadata_json": metadata,
        }

    def _process_image(self, payload: InboxCreate) -> dict:
        mime_type, raw_bytes = self._resolve_binary(payload)
        if not raw_bytes:
            raise ValueError("No se pudo obtener la imagen")

        optimized = optimize_image_to_preview(
            raw_bytes,
            max_width=560,
            max_height=420,
            output_format="JPEG",
            quality=66,
        )
        title = payload.title or self._title_from_url_or_default(payload.url, "Imagen")
        metadata = {
            "preview_kind": "image",
            "width": optimized["original_width"],
            "height": optimized["original_height"],
            "format": optimized["input_format"],
            "preview_width": optimized["preview_width"],
            "preview_height": optimized["preview_height"],
            "preview_bytes": optimized["preview_bytes"],
        }
        return {
            "title": title,
            "content": payload.content or "",
            "url": payload.url,
            "preview_base64": optimized["data_url"],
            "favicon_base64": None,
            "mime_type": mime_type or optimized["mime_type"],
            "metadata_json": metadata,
        }

    def _process_pdf(self, payload: InboxCreate) -> dict:
        mime_type, raw_bytes = self._resolve_binary(payload)
        if not raw_bytes:
            raise ValueError("No se pudo obtener el PDF")

        document = fitz.open(stream=raw_bytes, filetype="pdf")
        metadata_title = None
        page_count = 0
        preview_data_url = None
        try:
            metadata_title = (document.metadata or {}).get("title")
            page_count = document.page_count
            if page_count > 0:
                page = document.load_page(0)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3))
                optimized = optimize_image_to_preview(
                    pixmap.tobytes("png"),
                    max_width=560,
                    max_height=420,
                    output_format="JPEG",
                    quality=66,
                )
                preview_data_url = optimized["data_url"]
        finally:
            document.close()

        title = payload.title or truncate_title(metadata_title or self._title_from_url_or_default(payload.url, "PDF"))
        metadata = {
            "preview_kind": "pdf",
            "pages": page_count,
            "pdf_title": metadata_title,
        }
        if page_count > 0 and preview_data_url:
            metadata["preview_bytes"] = len(preview_data_url)
        return {
            "title": title,
            "content": payload.content or "",
            "url": payload.url,
            "preview_base64": preview_data_url,
            "favicon_base64": None,
            "mime_type": mime_type or "application/pdf",
            "metadata_json": metadata,
        }

    def _process_web(self, payload: InboxCreate) -> dict:
        url = payload.url or ""
        title = payload.title
        favicon_data_url = None
        metadata: dict = {"preview_kind": "web"}
        try:
            response = requests.get(url, timeout=self.timeout_seconds)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            page_title = (soup.title.string if soup.title else "") or ""
            if not title:
                title = truncate_title(page_title) if page_title else self._title_from_url_or_default(url, "Web")

            favicon_url = self._extract_favicon_url(url, soup)
            if favicon_url:
                icon_response = requests.get(favicon_url, timeout=self.timeout_seconds)
                if icon_response.ok and icon_response.content:
                    optimized_icon = optimize_image_to_preview(
                        icon_response.content,
                        max_width=64,
                        max_height=64,
                        output_format="PNG",
                    )
                    favicon_data_url = optimized_icon["data_url"]
                    metadata["favicon_url"] = favicon_url
        except Exception:
            if not title:
                title = self._title_from_url_or_default(url, "Web")

        if not favicon_data_url:
            fallback_icon = self._download_favicon_fallback(url)
            if fallback_icon:
                favicon_data_url = fallback_icon

        return {
            "title": title or "Web",
            "content": payload.content or "",
            "url": url,
            "preview_base64": None,
            "favicon_base64": favicon_data_url,
            "mime_type": "text/html",
            "metadata_json": metadata,
        }

    def _resolve_binary(self, payload: InboxCreate) -> tuple[str | None, bytes]:
        if payload.file_base64:
            base_mime, raw = decode_base64_payload(payload.file_base64)
            return payload.mime_type or base_mime, raw
        if payload.url:
            response = requests.get(payload.url, timeout=self.timeout_seconds)
            response.raise_for_status()
            mime_type = payload.mime_type or response.headers.get("content-type", "").split(";")[0]
            if not mime_type:
                mime_type = guess_mime_type_from_url(payload.url)
            return mime_type, response.content
        return payload.mime_type, b""

    def _extract_youtube_video_id(self, url: str) -> str | None:
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        if "youtu.be" in host:
            return parsed.path.strip("/") or None
        if "youtube.com" in host:
            query = parse_qs(parsed.query)
            if query.get("v"):
                return query["v"][0]
            if parsed.path.startswith("/shorts/"):
                return parsed.path.split("/shorts/")[-1].split("/")[0]
        return None

    def _extract_favicon_url(self, page_url: str, soup: BeautifulSoup) -> str | None:
        for rel in ("icon", "shortcut icon", "apple-touch-icon"):
            tag = soup.find("link", rel=lambda value: value and rel in value.lower())
            if tag and tag.get("href"):
                return urljoin(page_url, tag["href"])
        return urljoin(page_url, "/favicon.ico")

    def _download_favicon_fallback(self, page_url: str) -> str | None:
        try:
            fallback_url = urljoin(page_url, "/favicon.ico")
            response = requests.get(fallback_url, timeout=self.timeout_seconds)
            if response.ok and response.content:
                optimized_icon = optimize_image_to_preview(
                    response.content,
                    max_width=64,
                    max_height=64,
                    output_format="PNG",
                )
                return optimized_icon["data_url"]
        except Exception:
            return None
        return None

    def _title_from_url_or_default(self, url: str | None, default: str) -> str:
        if not url:
            return default
        parsed = urlparse(url)
        candidate = parsed.path.rsplit("/", 1)[-1] or parsed.netloc or default
        return truncate_title(candidate.replace("-", " ").replace("_", " ")) or default
