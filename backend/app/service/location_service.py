from __future__ import annotations

from typing import Optional

import requests

from app.config import settings


class LocationService:
    def __init__(self):
        self._cache: dict[tuple[float, float], Optional[str]] = {}

    def resolve_city(self, lat: float | None, lon: float | None) -> Optional[str]:
        if lat is None or lon is None:
            return None
        if not settings.GEOCODER_ENABLED:
            return None

        key = (round(lat, 3), round(lon, 3))
        if key in self._cache:
            return self._cache[key]

        city = self._fetch_city(lat=lat, lon=lon)
        self._cache[key] = city
        return city

    def _fetch_city(self, lat: float, lon: float) -> Optional[str]:
        params = {
            "format": "jsonv2",
            "lat": lat,
            "lon": lon,
            "addressdetails": 1,
            "zoom": 10,
        }
        headers = {
            "User-Agent": settings.GEOCODER_USER_AGENT,
            "Accept-Language": "es,en",
        }
        try:
            response = requests.get(
                settings.GEOCODER_BASE_URL,
                params=params,
                headers=headers,
                timeout=settings.GEOCODER_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            data = response.json()
        except Exception:
            return None

        address = data.get("address", {})
        raw_city = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
            or address.get("county")
            or address.get("state_district")
            or address.get("state")
        )
        if not raw_city:
            return None

        cleaned = " ".join(str(raw_city).split()).strip()
        return cleaned[:120] if cleaned else None
