import requests
import pytest

from app.config import settings
from app.models.inbox_item import InboxItemType
from app.schemas.inbox import InboxCreate
from app.service.inbox_ingest_service import InboxIngestionService


class _MockResponse:
    def __init__(self, content: bytes, headers: dict[str, str]):
        self.content = content
        self.headers = headers

    def raise_for_status(self):
        return None


def test_resolve_binary_raises_ssl_error_when_insecure_fetch_disabled(monkeypatch):
    service = InboxIngestionService()
    payload = InboxCreate(item_type=InboxItemType.PDF, url="https://example.com/file.pdf")

    monkeypatch.setattr(settings, "ALLOW_INSECURE_SSL_FETCH", False)

    def fake_get(url, timeout=8):  # noqa: ARG001
        raise requests.exceptions.SSLError("ssl cert verify failed")

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    with pytest.raises(requests.exceptions.SSLError):
        service._resolve_binary(payload)


def test_resolve_binary_retries_with_insecure_ssl_when_enabled(monkeypatch):
    service = InboxIngestionService()
    payload = InboxCreate(item_type=InboxItemType.PDF, url="https://example.com/file.pdf")

    monkeypatch.setattr(settings, "ALLOW_INSECURE_SSL_FETCH", True)
    calls: list[bool] = []

    def fake_get(url, timeout=8, verify=True):  # noqa: ARG001
        calls.append(verify)
        if verify:
            raise requests.exceptions.SSLError("ssl cert verify failed")
        return _MockResponse(
            content=b"%PDF-1.4 mock",
            headers={"content-type": "application/pdf"},
        )

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    mime_type, raw = service._resolve_binary(payload)

    assert mime_type == "application/pdf"
    assert raw.startswith(b"%PDF")
    assert calls == [True, False]
