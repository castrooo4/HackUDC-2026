import json
import re
from urllib.parse import parse_qs, urljoin, urlparse

import fitz
import requests
from bs4 import BeautifulSoup

from app.classes.ingestion_result import IngestionResult
from app.config import settings
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

    def process(self, payload: InboxCreate) -> IngestionResult:
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

    def _process_text(self, payload: InboxCreate) -> IngestionResult:
        content = payload.content or ""
        title = payload.title or generate_title_from_text(content)
        return IngestionResult(
            title=title,
            content=content,
            url=payload.url,
            preview_base64=None,
            favicon_base64=None,
            mime_type="text/plain",
            metadata_json={"preview_kind": "text"},
        )

    def _process_youtube(self, payload: InboxCreate) -> IngestionResult:
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

        watch_url = self._build_youtube_watch_url(url, video_id)
        page_meta = self._extract_youtube_page_metadata(watch_url) if watch_url else {}
        if page_meta:
            metadata.update(page_meta)
            if not title and page_meta.get("page_title"):
                title = truncate_title(str(page_meta["page_title"]))

        if not thumbnail_data_url and page_meta.get("thumbnail_url"):
            try:
                thumb_response = requests.get(str(page_meta["thumbnail_url"]), timeout=self.timeout_seconds)
                thumb_response.raise_for_status()
                optimized = optimize_image_to_preview(
                    thumb_response.content,
                    max_width=480,
                    max_height=270,
                    output_format="JPEG",
                    quality=66,
                )
                thumbnail_data_url = optimized["data_url"]
            except Exception:
                pass

        if not title:
            title = payload.title or f"YouTube video {video_id or ''}".strip()

        effective_content = payload.content or str(page_meta.get("description_excerpt") or "")

        return IngestionResult(
            title=title,
            content=effective_content,
            url=url,
            preview_base64=thumbnail_data_url,
            favicon_base64=None,
            mime_type="video/youtube",
            metadata_json=metadata,
        )

    def _process_image(self, payload: InboxCreate) -> IngestionResult:
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

        return IngestionResult(
            title=title,
            content=payload.content or "",
            url=payload.url,
            preview_base64=optimized["data_url"],
            favicon_base64=None,
            mime_type=mime_type or optimized["mime_type"],
            metadata_json=metadata,
        )

    def _process_pdf(self, payload: InboxCreate) -> IngestionResult:
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

        return IngestionResult(
            title=title,
            content=payload.content or "",
            url=payload.url,
            preview_base64=preview_data_url,
            favicon_base64=None,
            mime_type=mime_type or "application/pdf",
            metadata_json=metadata,
        )

    def _process_web(self, payload: InboxCreate) -> IngestionResult:
        url = payload.url or ""
        title = payload.title
        content = payload.content or ""
        favicon_data_url = None
        metadata: dict = {"preview_kind": "web"}

        try:
            response = requests.get(url, timeout=self.timeout_seconds)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            page_title = (soup.title.string if soup.title else "") or ""
            if not title:
                title = truncate_title(page_title) if page_title else self._title_from_url_or_default(url, "Web")

            meta_description = self._meta_content(soup, "name", "description")
            og_description = self._meta_content(soup, "property", "og:description")
            og_site_name = self._meta_content(soup, "property", "og:site_name")
            og_type = self._meta_content(soup, "property", "og:type")
            if meta_description:
                metadata["meta_description"] = self._compact_text(meta_description, 320)
            if og_description:
                metadata["og_description"] = self._compact_text(og_description, 320)
            if og_site_name:
                metadata["site_name"] = og_site_name
            if og_type:
                metadata["og_type"] = og_type

            if not content:
                best_desc = og_description or meta_description or ""
                content = self._compact_text(best_desc, 500) if best_desc else content

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

        return IngestionResult(
            title=title or "Web",
            content=content,
            url=url,
            preview_base64=None,
            favicon_base64=favicon_data_url,
            mime_type="text/html",
            metadata_json=metadata,
        )

    def _resolve_binary(self, payload: InboxCreate) -> tuple[str | None, bytes]:
        if payload.file_base64:
            base_mime, raw = decode_base64_payload(payload.file_base64)
            return payload.mime_type or base_mime, raw
        if payload.url:
            response = self._safe_get(payload.url)
            response.raise_for_status()
            mime_type = payload.mime_type or response.headers.get("content-type", "").split(";")[0]
            if not mime_type:
                mime_type = guess_mime_type_from_url(payload.url)
            return mime_type, response.content
        return payload.mime_type, b""

    def _safe_get(self, url: str) -> requests.Response:
        try:
            return requests.get(url, timeout=self.timeout_seconds)
        except requests.exceptions.SSLError:
            if not settings.ALLOW_INSECURE_SSL_FETCH:
                raise
            # Optional fallback for hosts with broken certificate chains.
            return requests.get(url, timeout=self.timeout_seconds, verify=False)

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

    def _build_youtube_watch_url(self, raw_url: str, video_id: str | None) -> str:
        if video_id:
            return f"https://www.youtube.com/watch?v={video_id}"
        return raw_url

    def _extract_youtube_page_metadata(self, watch_url: str) -> dict:
        result: dict = {}
        try:
            response = requests.get(watch_url, timeout=self.timeout_seconds)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            result["source_page"] = watch_url

            ld_video = self._extract_youtube_ld_video(soup)
            if ld_video:
                if isinstance(ld_video.get("name"), str):
                    result["page_title"] = truncate_title(ld_video["name"])
                if isinstance(ld_video.get("description"), str):
                    result["description_excerpt"] = self._compact_text(ld_video["description"], 320)
                if isinstance(ld_video.get("duration"), str):
                    result["duration_iso8601"] = ld_video["duration"]
                if isinstance(ld_video.get("uploadDate"), str):
                    result["upload_date"] = ld_video["uploadDate"]
                thumbnail_url = ld_video.get("thumbnailUrl")
                if isinstance(thumbnail_url, list) and thumbnail_url:
                    result["thumbnail_url"] = thumbnail_url[0]
                elif isinstance(thumbnail_url, str):
                    result["thumbnail_url"] = thumbnail_url
                author = ld_video.get("author")
                if isinstance(author, dict) and isinstance(author.get("name"), str):
                    result["channel_name"] = author["name"]
                elif isinstance(author, str):
                    result["channel_name"] = author

            keywords = soup.find("meta", attrs={"name": "keywords"})
            if keywords and keywords.get("content"):
                raw_keywords = [part.strip() for part in keywords["content"].split(",")]
                result["keywords"] = [value for value in raw_keywords if value][:12]

            interaction = soup.find("meta", attrs={"itemprop": "interactionCount"})
            if interaction and interaction.get("content"):
                content = interaction["content"].strip()
                if content.isdigit():
                    result["view_count"] = int(content)
        except Exception:
            return {}
        return result

    def _extract_youtube_ld_video(self, soup: BeautifulSoup) -> dict | None:
        scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
        for script in scripts:
            text = script.string or script.get_text() or ""
            if not text.strip():
                continue
            try:
                parsed = json.loads(text)
            except Exception:
                continue
            candidate = self._find_video_object(parsed)
            if candidate:
                return candidate
        return None

    def _find_video_object(self, payload) -> dict | None:
        if isinstance(payload, dict):
            payload_type = payload.get("@type")
            if payload_type == "VideoObject":
                return payload
            for value in payload.values():
                found = self._find_video_object(value)
                if found:
                    return found
        if isinstance(payload, list):
            for value in payload:
                found = self._find_video_object(value)
                if found:
                    return found
        return None

    def _compact_text(self, value: str, max_len: int) -> str:
        cleaned = re.sub(r"\s+", " ", value).strip()
        if len(cleaned) <= max_len:
            return cleaned
        return cleaned[: max_len - 3].rstrip() + "..."

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

    def _meta_content(self, soup: BeautifulSoup, attr_name: str, attr_value: str) -> str | None:
        tag = soup.find("meta", attrs={attr_name: attr_value})
        if not tag or not tag.get("content"):
            return None
        value = str(tag["content"]).strip()
        return value if value else None

    def _title_from_url_or_default(self, url: str | None, default: str) -> str:
        if not url:
            return default
        parsed = urlparse(url)
        candidate = parsed.path.rsplit("/", 1)[-1] or parsed.netloc or default
        return truncate_title(candidate.replace("-", " ").replace("_", " ")) or default

    def _compact_text(self, value: str, max_len: int) -> str:
        cleaned = re.sub(r"\s+", " ", value).strip()
        if len(cleaned) <= max_len:
            return cleaned
        return cleaned[: max_len - 3].rstrip() + "..."
