import pytest

from app.service.inbox_ingest_service import InboxIngestionService


class _MockResponse:
    status_code = 200

    def raise_for_status(self):
        return None


def test_safe_get_blocks_localhost():
    service = InboxIngestionService()

    with pytest.raises(ValueError, match="destinos locales"):
        service._safe_get("http://localhost:8000/private")


def test_safe_get_blocks_private_ip():
    service = InboxIngestionService()

    with pytest.raises(ValueError, match="destinos privados"):
        service._safe_get("http://192.168.1.10/internal")


def test_safe_get_allows_public_https(monkeypatch):
    service = InboxIngestionService()

    def fake_get(url, timeout=8, verify=True):  # noqa: ARG001
        return _MockResponse()

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    response = service._safe_get("https://example.com")
    assert response.status_code == 200

