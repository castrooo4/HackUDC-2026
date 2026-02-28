from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.inbox_item import InboxItem, InboxItemType, InboxStatus
from app.schemas.inbox import (
    InboxConfirmOrganization,
    InboxCreate,
    InboxRecommendationRead,
    InboxUpdate,
    YouTubeRecommendationRead,
)
from app.service.directory_service import DirectoryService
from app.service.inbox_ingest_service import InboxIngestionService
from app.service.location_service import LocationService
from app.utils.geo import distance_km, validate_location_pair


class InboxService:
    _REINGEST_FIELDS = {"item_type", "url", "file_base64", "mime_type"}
    _TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9]{3,}")

    def __init__(self):
        self.ingestion_service = InboxIngestionService()
        self.directory_service = DirectoryService()
        self.location_service = LocationService()

    def get_owned_item(self, session: Session, *, item_id: int, user_id: int) -> InboxItem | None:
        statement = select(InboxItem).where(InboxItem.id == item_id, InboxItem.user_id == user_id)
        return session.exec(statement).first()

    def create_item(self, session: Session, *, user_id: int, payload: InboxCreate) -> InboxItem:
        processed = self.ingestion_service.process(payload)
        location_lat, location_lon = validate_location_pair(payload.location_lat, payload.location_lon)
        location_city = self._resolve_city(location_lat, location_lon)

        item = InboxItem(
            user_id=user_id,
            source=payload.source,
            item_type=payload.item_type,
            title=processed.title,
            content=processed.content,
            url=processed.url,
            location_lat=location_lat,
            location_lon=location_lon,
            location_city=location_city,
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

    def update_item(self, session: Session, *, item: InboxItem, payload: InboxUpdate) -> InboxItem:
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
