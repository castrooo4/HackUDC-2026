from app.service.location_service import LocationService


class MockResponse:
    def __init__(self, payload: dict, status_code: int = 200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


def test_resolve_city_from_city_field(monkeypatch):
    service = LocationService()

    def fake_get(url, params, headers, timeout):
        return MockResponse({"address": {"city": "A Coruna"}})

    monkeypatch.setattr("app.service.location_service.requests.get", fake_get)
    city = service.resolve_city(43.3623, -8.4115)
    assert city == "A Coruna"


def test_resolve_city_fallback_to_town(monkeypatch):
    service = LocationService()

    def fake_get(url, params, headers, timeout):
        return MockResponse({"address": {"town": "Santiago de Compostela"}})

    monkeypatch.setattr("app.service.location_service.requests.get", fake_get)
    city = service.resolve_city(42.8782, -8.5448)
    assert city == "Santiago de Compostela"


def test_resolve_city_returns_none_on_network_error(monkeypatch):
    service = LocationService()

    def fake_get(url, params, headers, timeout):
        raise RuntimeError("network down")

    monkeypatch.setattr("app.service.location_service.requests.get", fake_get)
    city = service.resolve_city(40.4168, -3.7038)
    assert city is None


def test_resolve_city_uses_cache(monkeypatch):
    service = LocationService()
    calls = {"count": 0}

    def fake_get(url, params, headers, timeout):
        calls["count"] += 1
        return MockResponse({"address": {"city": "Madrid"}})

    monkeypatch.setattr("app.service.location_service.requests.get", fake_get)
    first = service.resolve_city(40.4168, -3.7038)
    second = service.resolve_city(40.41681, -3.70379)  # mismo bucket por redondeo a 3 decimales

    assert first == "Madrid"
    assert second == "Madrid"
    assert calls["count"] == 1


def test_resolve_city_disabled_geocoder(monkeypatch):
    service = LocationService()

    monkeypatch.setattr("app.service.location_service.settings.GEOCODER_ENABLED", False)
    city = service.resolve_city(43.3623, -8.4115)
    assert city is None


def test_resolve_city_uses_fallback_provider_when_nominatim_fails(monkeypatch):
    service = LocationService()
    calls = {"count": 0}

    def fake_get(url, params, headers, timeout):
        calls["count"] += 1
        if "nominatim" in url:
            raise RuntimeError("nominatim down")
        return MockResponse({"city": "Madrid"})

    monkeypatch.setattr("app.service.location_service.requests.get", fake_get)
    city = service.resolve_city(40.4168, -3.7038)
    assert city == "Madrid"
    assert calls["count"] == 2
