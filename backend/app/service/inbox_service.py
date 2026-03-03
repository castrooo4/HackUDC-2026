from __future__ import annotations

import hashlib
import os
import re
import threading
import time
from datetime import datetime, timezone

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.directory import Directory
from app.models.inbox_item import InboxItem, InboxItemType, InboxStatus
from app.models.text_merge_history import TextMergeHistory
from app.schemas.inbox import (
    InboxConfirmOrganization,
    InboxCreate,
    InboxPriorityReviewRead,
    MergeApplyRequest,
    MergeHistoryRead,
    MergeRejectRequest,
    InboxRecommendationRead,
    TextMergeSuggestionRead,
    InboxUpdate,
    YouTubeRecommendationRead,
)
from app.db.database import engine
from app.service.directory_service import DirectoryService
from app.service.inbox_ingest_service import InboxIngestionService
from app.service.location_service import LocationService
from app.utils.geo import distance_km, validate_location_pair
from app.config import settings


class InboxService:
    _REINGEST_FIELDS = {"item_type", "url", "file_base64", "mime_type"}
    _TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9]{3,}")
    _MERGE_MIN_SIMILARITY = 0.82
    _TOP_REVIEW_DEFAULT_LIMIT = 10

    def __init__(self):
        self.ingestion_service = InboxIngestionService()
        self.directory_service = DirectoryService()
        self.location_service = LocationService()

    def get_owned_item(self, session: Session, *, item_id: int, user_id: int) -> InboxItem | None:
        statement = select(InboxItem).where(InboxItem.id == item_id, InboxItem.user_id == user_id)
        return session.exec(statement).first()

    def create_item(self, session: Session, *, user_id: int, payload: InboxCreate) -> InboxItem:
        location_lat, location_lon = validate_location_pair(payload.location_lat, payload.location_lon)
        location_city = self._resolve_city(location_lat, location_lon)
        now = datetime.now(timezone.utc)

        processed = None
        attempts = 0
        last_error: str | None = None
        for _ in range(2):
            attempts += 1
            try:
                processed = self.ingestion_service.process(payload)
                break
            except Exception as exc:  # noqa: PERF203
                last_error = str(exc)

        if processed is None:
            fallback_title = payload.title or self._title_from_payload(payload)
            fallback_content = (payload.content or "").strip()
            fallback_url = payload.url

            item = InboxItem(
                user_id=user_id,
                source=payload.source,
                item_type=payload.item_type,
                title=fallback_title,
                content=fallback_content,
                content_hash=self._content_hash(fallback_content),
                dedupe_key=self._build_dedupe_key(payload.item_type, fallback_url, None, fallback_content),
                url=fallback_url,
                location_lat=location_lat,
                location_lon=location_lon,
                location_city=location_city,
                status=InboxStatus.PENDING,
                processing_attempts=attempts,
                last_processing_error=self._compact_error(last_error),
            )
            session.add(item)
            session.commit()
            session.refresh(item)
            self._schedule_background_retry(item.id, user_id, payload.model_dump())
            return item

        content_hash = self._content_hash(processed.content)
        dedupe_key = self._build_dedupe_key(
            payload.item_type,
            processed.url,
            processed.metadata_json,
            processed.content,
        )
        duplicate = self._find_duplicate(
            session,
            user_id=user_id,
            item_type=payload.item_type,
            dedupe_key=dedupe_key,
            content_hash=content_hash,
        )
        if duplicate:
            duplicate.save_count += 1
            duplicate.created_at = now
            duplicate.processing_attempts = max(duplicate.processing_attempts, attempts)
            if duplicate.status == InboxStatus.PENDING and processed is not None:
                duplicate.title = processed.title
                duplicate.content = processed.content
                duplicate.content_hash = content_hash
                duplicate.dedupe_key = dedupe_key
                duplicate.url = processed.url
                duplicate.preview_base64 = processed.preview_base64
                duplicate.favicon_base64 = processed.favicon_base64
                duplicate.mime_type = processed.mime_type
                duplicate.metadata_json = processed.metadata_json
                duplicate.last_processing_error = None
            if location_lat is not None and location_lon is not None:
                duplicate.location_lat = location_lat
                duplicate.location_lon = location_lon
                duplicate.location_city = location_city
            session.add(duplicate)
            session.commit()
            session.refresh(duplicate)
            if duplicate.status == InboxStatus.PENDING and processed is not None:
                duplicate = self.directory_service.suggest_directory_for_item(session, user_id, duplicate)
                self._attach_best_merge_suggestion(session, user_id=user_id, item=duplicate)
            return duplicate

        item = InboxItem(
            user_id=user_id,
            source=payload.source,
            item_type=payload.item_type,
            title=processed.title,
            content=processed.content,
            content_hash=content_hash,
            dedupe_key=dedupe_key,
            url=processed.url,
            location_lat=location_lat,
            location_lon=location_lon,
            location_city=location_city,
            preview_base64=processed.preview_base64,
            favicon_base64=processed.favicon_base64,
            mime_type=processed.mime_type,
            metadata_json=processed.metadata_json,
            status=InboxStatus.PENDING,
            processing_attempts=attempts,
            last_processing_error=None,
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        item = self.directory_service.suggest_directory_for_item(session, user_id, item)
        self._attach_best_merge_suggestion(session, user_id=user_id, item=item)
        return item

    def list_items(
        self,
        session: Session,
        *,
        user_id: int,
        status_filter: InboxStatus | None = None,
        city: str | None = None,
    ) -> list[InboxItem]:
        statement = select(InboxItem).where(InboxItem.user_id == user_id)
        if status_filter is not None:
            statement = statement.where(InboxItem.status == status_filter)
        if city:
            statement = statement.where(func.lower(InboxItem.location_city) == city.strip().lower())
        statement = statement.order_by(InboxItem.created_at.desc())
        return list(session.exec(statement).all())

    def list_cities(self, session: Session, *, user_id: int) -> list[tuple[str, int]]:
        statement = (
            select(InboxItem.location_city, func.count(InboxItem.id))
            .where(
                InboxItem.user_id == user_id,
                InboxItem.location_city.is_not(None),
            )
            .group_by(InboxItem.location_city)
            .order_by(func.count(InboxItem.id).desc(), InboxItem.location_city.asc())
        )
        rows = session.exec(statement).all()
        return [(city, count) for city, count in rows if city]

    def list_top_priority_review(
        self,
        session: Session,
        *,
        user_id: int,
        limit: int = _TOP_REVIEW_DEFAULT_LIMIT,
        current_lat: float | None = None,
        current_lon: float | None = None,
    ) -> list[InboxPriorityReviewRead]:
        normalized_limit = max(1, min(100, int(limit)))
        statement = (
            select(InboxItem)
            .where(
                InboxItem.user_id == user_id,
            )
            .order_by(InboxItem.created_at.desc())
        )
        items = list(session.exec(statement).all())
        if not items:
            return []

        directories = session.exec(select(Directory).where(Directory.user_id == user_id)).all()
        directory_name_by_id = {directory.id: directory.name for directory in directories}
        now = datetime.now(timezone.utc)

        ranked: list[InboxPriorityReviewRead] = []
        for item in items:
            score, factors = self._priority_score(
                item,
                now=now,
                directory_name_by_id=directory_name_by_id,
                current_lat=current_lat,
                current_lon=current_lon,
            )
            ranked.append(
                InboxPriorityReviewRead(
                    item=item,
                    priority_score=round(score, 4),
                    factors=factors,
                )
            )

        ranked.sort(
            key=lambda row: (
                row.priority_score,
                row.item.save_count,
                row.item.created_at,
            ),
            reverse=True,
        )
        return ranked[:normalized_limit]

    def get_recommendations_by_item_location(
        self,
        session: Session,
        *,
        base_item: InboxItem,
        user_id: int,
        radius_km: float = 25.0,
        limit: int = 20,
    ) -> list[InboxRecommendationRead]:
        if base_item.location_lat is None or base_item.location_lon is None:
            raise ValueError("El inbox base no tiene ubicacion para calcular recomendaciones")

        statement = (
            select(InboxItem)
            .where(InboxItem.user_id == user_id, InboxItem.id != base_item.id)
            .order_by(InboxItem.created_at.desc())
        )
        candidates = list(session.exec(statement).all())

        recommendations: list[InboxRecommendationRead] = []
        for candidate in candidates:
            if candidate.location_lat is None or candidate.location_lon is None:
                continue
            distance = distance_km(
                base_item.location_lat,
                base_item.location_lon,
                candidate.location_lat,
                candidate.location_lon,
            )
            if distance <= radius_km:
                recommendations.append(
                    InboxRecommendationRead(
                        item=candidate,
                        distance_km=round(distance, 2),
                    )
                )

        recommendations.sort(key=lambda rec: rec.distance_km)
        return recommendations[:limit]

    def get_youtube_recommendations(
        self,
        session: Session,
        *,
        user_id: int,
        current_url: str | None = None,
        current_title: str | None = None,
        current_channel: str | None = None,
        limit: int = 20,
    ) -> list[YouTubeRecommendationRead]:
        statement = (
            select(InboxItem)
            .where(InboxItem.user_id == user_id, InboxItem.item_type == InboxItemType.YOUTUBE)
            .order_by(InboxItem.created_at.desc())
        )
        candidates = list(session.exec(statement).all())
        if not candidates:
            return []

        query_tokens = self._tokens(" ".join(filter(None, [current_title, current_channel, current_url])))
        now = datetime.now(timezone.utc)

        ranked: list[tuple[float, InboxItem]] = []
        for item in candidates:
            item_tokens = self._candidate_tokens(item)
            overlap = self._token_overlap(query_tokens, item_tokens)

            same_channel_boost = 0.0
            if current_channel and item.metadata_json:
                channel_name = str(item.metadata_json.get("channel_name") or "").strip().lower()
                if channel_name and channel_name == current_channel.strip().lower():
                    same_channel_boost = 0.2

            recency_boost = self._recency_boost(item.created_at, now)
            score = overlap + same_channel_boost + recency_boost
            ranked.append((score, item))

        ranked.sort(key=lambda pair: (pair[0], pair[1].created_at), reverse=True)

        return [
            YouTubeRecommendationRead(item=item, score=round(score, 4))
            for score, item in ranked[:limit]
        ]

    def list_text_merge_suggestions(
        self,
        session: Session,
        *,
        user_id: int,
        limit: int = 20,
    ) -> list[TextMergeSuggestionRead]:
        statement = (
            select(InboxItem)
            .where(InboxItem.user_id == user_id, InboxItem.item_type == InboxItemType.TEXT)
            .order_by(InboxItem.created_at.desc())
        )
        items = list(session.exec(statement).all())
        suggestions: list[TextMergeSuggestionRead] = []

        for source in items:
            source_meta = source.metadata_json or {}
            if source_meta.get("merged_into_id"):
                continue
            rejected_ids = self._extract_rejected_target_ids(source_meta)
            target, score = self._best_merge_target_for_item(source, items, rejected_ids=rejected_ids)
            if not target or score < self._MERGE_MIN_SIMILARITY:
                continue
            preview = self._build_merge_preview(source, target)
            suggestions.append(
                TextMergeSuggestionRead(
                    source_item=source,
                    target_item=target,
                    similarity_score=round(score, 4),
                    preview_markdown=preview,
                )
            )
            if len(suggestions) >= limit:
                break
        return suggestions

    def apply_text_merge(
        self,
        session: Session,
        *,
        user_id: int,
        source_item: InboxItem,
        payload: MergeApplyRequest,
    ) -> MergeHistoryRead:
        if source_item.item_type != InboxItemType.TEXT:
            raise ValueError("Solo se permite merge para items TEXT")

        target = self.get_owned_item(session, item_id=payload.target_item_id, user_id=user_id)
        if not target:
            raise ValueError("Target item not found")
        if target.item_type != InboxItemType.TEXT:
            raise ValueError("Target item must be TEXT")
        if target.id == source_item.id:
            raise ValueError("source y target no pueden ser el mismo item")

        preview = self._build_merge_preview(source_item, target)
        history = TextMergeHistory(
            user_id=user_id,
            source_item_id=source_item.id,
            target_item_id=target.id,
            preview_markdown=preview,
            snapshot_target_title=target.title,
            snapshot_target_content=target.content or "",
        )
        session.add(history)
        session.flush()

        merged_content = self._merge_text_content(target.content or "", source_item.content or "")
        target.content = merged_content
        target.content_hash = self._content_hash(merged_content)
        target.save_count += max(1, source_item.save_count)
        target.created_at = datetime.now(timezone.utc)

        source_meta = dict(source_item.metadata_json or {})
        source_meta["merged_into_id"] = target.id
        source_meta["merge_history_id"] = history.id
        source_item.metadata_json = source_meta
        source_item.status = InboxStatus.ORGANIZED

        session.add(target)
        session.add(source_item)
        session.commit()
        session.refresh(history)
        return MergeHistoryRead.model_validate(history)

    def reject_text_merge_suggestion(
        self,
        session: Session,
        *,
        user_id: int,
        source_item: InboxItem,
        payload: MergeRejectRequest,
    ) -> InboxItem:
        if source_item.item_type != InboxItemType.TEXT:
            raise ValueError("Solo se permite rechazar merge para items TEXT")

        target = self.get_owned_item(session, item_id=payload.target_item_id, user_id=user_id)
        if not target:
            raise ValueError("Target item not found")
        if target.item_type != InboxItemType.TEXT:
            raise ValueError("Target item must be TEXT")
        if target.id == source_item.id:
            raise ValueError("source y target no pueden ser el mismo item")

        metadata = dict(source_item.metadata_json or {})
        rejected_ids = metadata.get("merge_rejected_target_ids") or []
        normalized: list[int] = []
        for value in rejected_ids:
            try:
                parsed = int(value)
                if parsed > 0 and parsed not in normalized:
                    normalized.append(parsed)
            except Exception:
                continue
        if target.id not in normalized:
            normalized.append(target.id)
        metadata["merge_rejected_target_ids"] = normalized

        suggestion = metadata.get("merge_suggestion") or {}
        if isinstance(suggestion, dict) and suggestion.get("target_item_id") == target.id:
            metadata.pop("merge_suggestion", None)

        source_item.metadata_json = metadata
        session.add(source_item)
        session.commit()
        session.refresh(source_item)
        self._attach_best_merge_suggestion(session, user_id=user_id, item=source_item)
        session.refresh(source_item)
        return source_item

    def revert_text_merge(
        self,
        session: Session,
        *,
        user_id: int,
        history_id: int,
    ) -> MergeHistoryRead:
        history = session.get(TextMergeHistory, history_id)
        if not history or history.user_id != user_id:
            raise ValueError("Merge history not found")
        if history.reverted_at is not None:
            raise ValueError("Merge history already reverted")

        target = self.get_owned_item(session, item_id=history.target_item_id, user_id=user_id)
        source = self.get_owned_item(session, item_id=history.source_item_id, user_id=user_id)
        if not target or not source:
            raise ValueError("Source or target item not found")

        restored_content = history.snapshot_target_content or ""
        target.title = history.snapshot_target_title
        target.content = restored_content
        target.content_hash = self._content_hash(restored_content)

        source_meta = dict(source.metadata_json or {})
        if source_meta.get("merged_into_id") == target.id:
            source_meta.pop("merged_into_id", None)
        source_meta.pop("merge_history_id", None)
        source.metadata_json = source_meta or None
        source.status = InboxStatus.PROCESSED

        history.reverted_at = datetime.now(timezone.utc)
        session.add(history)
        session.add(target)
        session.add(source)
        session.commit()
        session.refresh(history)
        return MergeHistoryRead.model_validate(history)

    def update_item(self, session: Session, *, user_id: int, item: InboxItem, payload: InboxUpdate) -> InboxItem:
        update_data = payload.model_dump(exclude_unset=True)
        has_lat = "location_lat" in update_data
        has_lon = "location_lon" in update_data
        if has_lat != has_lon:
            raise ValueError("location_lat y location_lon deben enviarse juntos")

        if self._requires_reingest(update_data):
            target_item_type = update_data.get("item_type", item.item_type)
            merged_content = update_data.get("content")
            if merged_content is None and target_item_type == InboxItemType.TEXT:
                merged_content = item.content

            merged_payload = InboxCreate(
                source=update_data.get("source", item.source),
                item_type=target_item_type,
                title=update_data.get("title"),
                content=merged_content,
                url=update_data.get("url", item.url),
                location_lat=update_data.get("location_lat", item.location_lat),
                location_lon=update_data.get("location_lon", item.location_lon),
                file_base64=update_data.get("file_base64"),
                mime_type=update_data.get("mime_type", item.mime_type),
            )
            processed = self.ingestion_service.process(merged_payload)

            item.source = merged_payload.source
            item.item_type = merged_payload.item_type
            item.title = processed.title
            item.content = processed.content
            item.url = processed.url
            item.preview_base64 = processed.preview_base64
            item.favicon_base64 = processed.favicon_base64
            item.mime_type = processed.mime_type
            item.metadata_json = processed.metadata_json
        else:
            if "source" in update_data:
                item.source = update_data["source"]
            if "title" in update_data:
                item.title = update_data["title"]
            if "content" in update_data:
                item.content = update_data["content"]

        if "directory_id" in update_data:
            directory_id = update_data.get("directory_id")
            if directory_id is None:
                raise ValueError("directory_id no puede ser null")
            target = self.directory_service.get_directory_by_id(session, user_id, directory_id)
            if not target:
                raise ValueError("Directory not found")
            item.directory_id = target.id

        if "directory_name" in update_data:
            directory_name = update_data.get("directory_name")
            if directory_name is None:
                raise ValueError("directory_name no puede ser null")
            target = self.directory_service.get_or_create_directory_by_name(session, user_id, directory_name)
            item.directory_id = target.id

        if has_lat and has_lon:
            lat, lon = validate_location_pair(update_data.get("location_lat"), update_data.get("location_lon"))
            item.location_lat = lat
            item.location_lon = lon
            item.location_city = self._resolve_city(lat, lon)

        session.add(item)
        session.commit()
        session.refresh(item)
        return item

    def delete_item(self, session: Session, *, item: InboxItem) -> None:
        session.delete(item)
        session.commit()

    def confirm_organization(
        self,
        session: Session,
        *,
        user_id: int,
        item: InboxItem,
        payload: InboxConfirmOrganization,
    ) -> InboxItem:
        if item.status != InboxStatus.PROCESSED:
            raise RuntimeError("InboxItem must be PROCESSED to confirm organization")

        return self.directory_service.confirm_item_directory(
            session=session,
            user_id=user_id,
            item=item,
            directory_id=payload.directory_id,
            directory_name=payload.directory_name,
        )

    def _schedule_background_retry(self, item_id: int, user_id: int, payload_data: dict) -> None:
        if os.getenv("PYTEST_CURRENT_TEST"):
            return

        def _runner():
            for delay in self._ingest_retry_delays():
                time.sleep(delay)
                with Session(engine) as retry_session:
                    item = retry_session.get(InboxItem, item_id)
                    if not item or item.user_id != user_id or item.status != InboxStatus.PENDING:
                        return
                    try:
                        payload = InboxCreate(**payload_data)
                        processed = self.ingestion_service.process(payload)
                        item.title = processed.title
                        item.content = processed.content
                        item.content_hash = self._content_hash(processed.content)
                        item.url = processed.url
                        item.preview_base64 = processed.preview_base64
                        item.favicon_base64 = processed.favicon_base64
                        item.mime_type = processed.mime_type
                        item.metadata_json = processed.metadata_json
                        item.processing_attempts += 1
                        item.last_processing_error = None
                        retry_session.add(item)
                        retry_session.commit()
                        retry_session.refresh(item)
                        self.directory_service.suggest_directory_for_item(retry_session, user_id, item)
                        self._attach_best_merge_suggestion(retry_session, user_id=user_id, item=item)
                        return
                    except Exception as exc:  # noqa: PERF203
                        item.processing_attempts += 1
                        item.last_processing_error = self._compact_error(str(exc))
                        retry_session.add(item)
                        retry_session.commit()

        threading.Thread(target=_runner, daemon=True).start()

    def _ingest_retry_delays(self) -> tuple[float, ...]:
        raw = settings.INGEST_RETRY_DELAYS_SECONDS
        parts = [part.strip() for part in raw.split(",") if part.strip()]
        parsed: list[float] = []
        for part in parts:
            try:
                value = float(part)
                if value > 0:
                    parsed.append(value)
            except ValueError:
                continue
        if parsed:
            return tuple(parsed)
        return (3.0, 8.0, 20.0)

    def _find_duplicate(
        self,
        session: Session,
        *,
        user_id: int,
        item_type: InboxItemType,
        dedupe_key: str | None,
        content_hash: str | None,
    ) -> InboxItem | None:
        if dedupe_key:
            statement = (
                select(InboxItem)
                .where(
                    InboxItem.user_id == user_id,
                    InboxItem.item_type == item_type,
                    InboxItem.dedupe_key == dedupe_key,
                )
                .order_by(InboxItem.created_at.desc())
            )
            existing = session.exec(statement).first()
            if existing:
                return existing

        if item_type == InboxItemType.TEXT and content_hash:
            statement = (
                select(InboxItem)
                .where(
                    InboxItem.user_id == user_id,
                    InboxItem.item_type == InboxItemType.TEXT,
                    InboxItem.content_hash == content_hash,
                )
                .order_by(InboxItem.created_at.desc())
            )
            return session.exec(statement).first()

        return None

    def _build_dedupe_key(
        self,
        item_type: InboxItemType,
        url: str | None,
        metadata: dict | None,
        content: str | None,
    ) -> str | None:
        if item_type == InboxItemType.YOUTUBE:
            video_id = ""
            if metadata:
                video_id = str(metadata.get("video_id") or "").strip()
            if not video_id:
                video_id = self._extract_youtube_video_id(url)
            return f"youtube:{video_id.lower()}" if video_id else None

        if url:
            return f"url:{self._normalize_url(url)}"

        if item_type == InboxItemType.TEXT and content:
            return f"text:{self._content_hash(content)}"

        return None

    def _content_hash(self, content: str | None) -> str | None:
        if not content:
            return None
        normalized = " ".join(content.lower().split())
        if not normalized:
            return None
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def _normalize_url(self, url: str) -> str:
        value = (url or "").strip().lower()
        value = re.sub(r"[#?].*$", "", value)
        value = value.rstrip("/")
        return value

    def _title_from_payload(self, payload: InboxCreate) -> str:
        if payload.title:
            return payload.title
        if payload.url:
            return payload.url
        return f"{payload.item_type.value} item"

    def _compact_error(self, error: str | None) -> str | None:
        if not error:
            return None
        return str(error).strip()[:500]

    def _attach_best_merge_suggestion(self, session: Session, *, user_id: int, item: InboxItem) -> None:
        if item.item_type != InboxItemType.TEXT:
            return
        statement = (
            select(InboxItem)
            .where(
                InboxItem.user_id == user_id,
                InboxItem.item_type == InboxItemType.TEXT,
                InboxItem.id != item.id,
            )
            .order_by(InboxItem.created_at.desc())
        )
        others = list(session.exec(statement).all())
        rejected_ids = self._extract_rejected_target_ids(item.metadata_json)
        target, score = self._best_merge_target_for_item(item, others, rejected_ids=rejected_ids)
        if not target or score < self._MERGE_MIN_SIMILARITY:
            return

        metadata = dict(item.metadata_json or {})
        metadata["merge_suggestion"] = {
            "target_item_id": target.id,
            "similarity_score": round(score, 4),
            "preview_markdown": self._build_merge_preview(item, target),
        }
        item.metadata_json = metadata
        session.add(item)
        session.commit()

    def _best_merge_target_for_item(
        self,
        source: InboxItem,
        candidates: list[InboxItem],
        *,
        rejected_ids: set[int] | None = None,
    ) -> tuple[InboxItem | None, float]:
        best_item = None
        best_score = 0.0
        source_tokens = self._tokens(source.content or source.title or "")
        rejected = rejected_ids or set()
        for candidate in candidates:
            if candidate.id == source.id:
                continue
            if candidate.id in rejected:
                continue
            candidate_meta = candidate.metadata_json or {}
            if candidate_meta.get("merged_into_id"):
                continue
            candidate_tokens = self._tokens(candidate.content or candidate.title or "")
            score = self._token_overlap(source_tokens, candidate_tokens)
            if score > best_score:
                best_score = score
                best_item = candidate
        return best_item, best_score

    def _extract_rejected_target_ids(self, metadata: dict | None) -> set[int]:
        if not isinstance(metadata, dict):
            return set()
        raw_values = metadata.get("merge_rejected_target_ids") or []
        result: set[int] = set()
        for value in raw_values:
            try:
                parsed = int(value)
                if parsed > 0:
                    result.add(parsed)
            except Exception:
                continue
        return result

    def _merge_text_content(self, target_content: str, source_content: str) -> str:
        chunks = [chunk.strip() for chunk in [target_content, source_content] if chunk and chunk.strip()]
        if not chunks:
            return ""
        unique_chunks: list[str] = []
        seen = set()
        for chunk in chunks:
            key = " ".join(chunk.lower().split())
            if key in seen:
                continue
            seen.add(key)
            unique_chunks.append(chunk)
        return "\n\n".join(unique_chunks)

    def _build_merge_preview(self, source: InboxItem, target: InboxItem) -> str:
        source_content = (source.content or "").strip()
        target_content = (target.content or "").strip()
        merged = self._merge_text_content(target_content, source_content)
        return (
            f"## Merge Suggestion\n\n"
            f"- Source: #{source.id} {source.title or ''}\n"
            f"- Target: #{target.id} {target.title or ''}\n\n"
            f"### Result Preview\n\n{merged[:1400]}"
        )

    def _resolve_city(self, lat: float | None, lon: float | None) -> str | None:
        if lat is None or lon is None:
            return None
        return self.location_service.resolve_city(lat, lon)

    def _requires_reingest(self, update_data: dict) -> bool:
        return any(field in update_data for field in self._REINGEST_FIELDS)

    def _extract_youtube_video_id(self, url: str | None) -> str | None:
        if not url:
            return None
        patterns = [
            r"(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{11})",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    def _tokens(self, text: str | None) -> set[str]:
        if not text:
            return set()
        lowered = text.lower()
        tokens = {token for token in self._TOKEN_PATTERN.findall(lowered) if len(token) > 2}
        return tokens

    def _candidate_tokens(self, item: InboxItem) -> set[str]:
        metadata = item.metadata_json or {}
        metadata_keywords = metadata.get("keywords")
        keywords_text = ""
        if isinstance(metadata_keywords, list):
            keywords_text = " ".join(str(value) for value in metadata_keywords if value)
        elif isinstance(metadata_keywords, str):
            keywords_text = metadata_keywords

        merged = " ".join(
            filter(
                None,
                [
                    item.title or "",
                    item.content or "",
                    str(metadata.get("channel_name") or ""),
                    str(metadata.get("description_excerpt") or ""),
                    str(metadata.get("og_description") or ""),
                    keywords_text,
                ],
            )
        )
        return self._tokens(merged)

    def _token_overlap(self, query_tokens: set[str], item_tokens: set[str]) -> float:
        if not query_tokens or not item_tokens:
            return 0.0
        common = query_tokens.intersection(item_tokens)
        if not common:
            return 0.0
        return len(common) / max(1, len(query_tokens))

    def _recency_boost(self, created_at: datetime, now: datetime) -> float:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (now - created_at).total_seconds() / 86400)
        if age_days <= 7:
            return 0.2
        if age_days <= 30:
            return 0.1
        if age_days <= 90:
            return 0.05
        return 0.0

    def _priority_score(
        self,
        item: InboxItem,
        *,
        now: datetime,
        directory_name_by_id: dict[int, str],
        current_lat: float | None = None,
        current_lon: float | None = None,
    ) -> tuple[float, dict]:
        recency = self._review_recency_score(item.created_at, now=now)
        frequency = min(1.0, max(0.0, ((item.save_count or 1) - 1) / 6.0))
        type_score = self._review_type_score(item.item_type)
        folder_score = self._review_folder_score(item, directory_name_by_id)
        metadata_score = self._review_metadata_score(item)
        location_score, location_distance_km = self._review_location_score(
            item,
            current_lat=current_lat,
            current_lon=current_lon,
        )

        status_boost = 0.15 if item.status == InboxStatus.PENDING else 0.0
        error_boost = 0.25 if item.last_processing_error else 0.0
        merge_boost = 0.1 if isinstance(item.metadata_json, dict) and item.metadata_json.get("merge_suggestion") else 0.0

        score = (
            0.15 * recency
            + 0.12 * frequency
            + 0.09 * type_score
            + 0.07 * folder_score
            + 0.20 * metadata_score
            + 0.32 * location_score
            + status_boost
            + error_boost
            + merge_boost
        )
        factors = {
            "recency": round(recency, 4),
            "frequency": round(frequency, 4),
            "type": round(type_score, 4),
            "target_folder": round(folder_score, 4),
            "metadata": round(metadata_score, 4),
            "location": round(location_score, 4),
            "distance_km": round(location_distance_km, 2) if location_distance_km is not None else None,
            "status_boost": round(status_boost, 4),
            "error_boost": round(error_boost, 4),
            "merge_boost": round(merge_boost, 4),
        }
        return score, factors

    def _review_recency_score(self, created_at: datetime, *, now: datetime) -> float:
        value = created_at
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (now - value).total_seconds() / 86400.0)

        # Ventana principal de revision: entre 1 y 14 dias.
        if age_days < 1:
            return 0.55
        if age_days <= 14:
            return 1.0
        if age_days <= 30:
            # Inicio de decaimiento suave tras la ventana principal.
            progress = (age_days - 14) / 16.0
            return 1.0 - (0.35 * progress)  # 1.00 -> 0.65
        if age_days <= 60:
            progress = (age_days - 30) / 30.0
            return 0.65 - (0.25 * progress)  # 0.65 -> 0.40
        if age_days <= 120:
            progress = (age_days - 60) / 60.0
            return 0.40 - (0.20 * progress)  # 0.40 -> 0.20
        return 0.08

    def _review_type_score(self, item_type: InboxItemType) -> float:
        scores = {
            InboxItemType.TEXT: 1.0,
            InboxItemType.PDF: 0.9,
            InboxItemType.YOUTUBE: 0.86,
            InboxItemType.WEB: 0.78,
            InboxItemType.IMAGE: 0.74,
        }
        return scores.get(item_type, 0.7)

    def _review_folder_score(self, item: InboxItem, directory_name_by_id: dict[int, str]) -> float:
        if item.directory_id is None:
            return 1.0
        folder_name = (directory_name_by_id.get(item.directory_id) or "").strip().lower()
        if not folder_name:
            return 0.55

        by_type = {
            InboxItemType.TEXT: {"trabajo", "personal"},
            InboxItemType.PDF: {"documentos", "trabajo"},
            InboxItemType.YOUTUBE: {"aprendizaje", "trabajo", "documentos"},
            InboxItemType.WEB: {"trabajo", "documentos"},
            InboxItemType.IMAGE: {"documentos", "personal"},
        }
        preferred = by_type.get(item.item_type, set())
        if folder_name in preferred:
            return 0.92
        return 0.5

    def _review_metadata_score(self, item: InboxItem) -> float:
        score = 0.0
        has_title = bool((item.title or "").strip())
        has_content = bool((item.content or "").strip())
        has_preview = bool((item.preview_base64 or "").strip())
        has_url = bool((item.url or "").strip())
        has_favicon = bool((item.favicon_base64 or "").strip())
        has_mime = bool((item.mime_type or "").strip())

        if has_title:
            score += 0.18
        if has_content:
            score += 0.18
        if has_preview:
            score += 0.14
        if has_url:
            score += 0.10
        if has_favicon:
            score += 0.06
        if has_mime:
            score += 0.06

        metadata = item.metadata_json if isinstance(item.metadata_json, dict) else {}
        if metadata:
            score += min(0.28, 0.05 * len([k for k, v in metadata.items() if v not in (None, "", [], {})]))
            for key in (
                "video_id",
                "channel_name",
                "thumbnail_url",
                "og_title",
                "og_description",
                "pdf_title",
                "image_title",
            ):
                if metadata.get(key):
                    score += 0.02

        return max(0.0, min(1.0, score))

    def _review_location_score(
        self,
        item: InboxItem,
        *,
        current_lat: float | None = None,
        current_lon: float | None = None,
    ) -> tuple[float, float | None]:
        if item.location_lat is None or item.location_lon is None:
            return 0.0, None

        if current_lat is None or current_lon is None:
            # Tiene geoposición pero no hay contexto del usuario.
            return 0.5, None

        distance = distance_km(current_lat, current_lon, item.location_lat, item.location_lon)
        if distance <= 2:
            return 1.0, distance
        if distance <= 10:
            return 0.92, distance
        if distance <= 25:
            return 0.82, distance
        if distance <= 50:
            return 0.72, distance
        if distance <= 120:
            return 0.62, distance
        if distance <= 250:
            return 0.42, distance
        return 0.12, distance
