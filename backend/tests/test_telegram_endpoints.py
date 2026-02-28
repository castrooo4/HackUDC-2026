from io import BytesIO

from PIL import Image

from app.config import settings


class MockResponse:
    def __init__(self, *, status_code=200, json_data=None, content=b"", headers=None):
        self.status_code = status_code
        self._json_data = json_data
        self.content = content
        self.headers = headers or {}
        self.ok = 200 <= status_code < 300

    def raise_for_status(self):
        if not self.ok:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._json_data


def _build_png_bytes(width=1200, height=800, color=(10, 200, 140)):
    image = Image.new("RGB", (width, height), color=color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _link_chat(client, auth_headers, chat_id=123456, user_id=777):
    code_response = client.post("/telegram/link-code", headers=auth_headers)
    assert code_response.status_code == 200
    code = code_response.json()["code"]

    start_update = {
        "message": {
            "chat": {"id": chat_id, "type": "private"},
            "from": {"id": user_id},
            "text": f"/start {code}",
        }
    }
    linked = client.post("/telegram/webhook", json=start_update)
    assert linked.status_code == 200
    assert linked.json()["linked"] is True


def test_telegram_link_code_requires_auth(client):
    response = client.post("/telegram/link-code")
    assert response.status_code == 401


def test_telegram_link_and_ingest_text_note(client, auth_headers):
    _link_chat(client, auth_headers, chat_id=5001, user_id=812)

    status_response = client.get("/telegram/link", headers=auth_headers)
    assert status_response.status_code == 200
    assert status_response.json()["linked"] is True
    assert status_response.json()["telegram_chat_id"] == "5001"

    text_update = {
        "message": {
            "chat": {"id": 5001, "type": "private"},
            "from": {"id": 812},
            "text": "Nota enviada por Telegram para guardar en mi cuenta",
        }
    }
    webhook_response = client.post("/telegram/webhook", json=text_update)
    assert webhook_response.status_code == 200
    assert webhook_response.json()["handled"] is True
    assert webhook_response.json()["item_type"] == "TEXT"

    listed = client.get("/inbox", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    item = listed.json()[0]
    assert item["source"] == "telegram"
    assert item["item_type"] == "TEXT"
    assert "Nota enviada por Telegram" in item["content"]


def test_telegram_webhook_ignores_unlinked_chat(client, auth_headers):
    update = {
        "message": {
            "chat": {"id": 9111, "type": "private"},
            "from": {"id": 101},
            "text": "hola bot",
        }
    }
    response = client.post("/telegram/webhook", json=update)
    assert response.status_code == 200
    assert response.json()["handled"] is False
    assert response.json()["reason"] == "chat_not_linked"

    listed = client.get("/inbox", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json() == []


def test_telegram_ingest_photo_note(client, monkeypatch, auth_headers):
    _link_chat(client, auth_headers, chat_id=7001, user_id=900)
    image_bytes = _build_png_bytes()

    def fake_get(url, params=None, timeout=8):
        if "getFile" in url:
            assert params == {"file_id": "photo-file-main"}
            return MockResponse(
                json_data={"ok": True, "result": {"file_path": "photos/telegram-photo.jpg"}},
                headers={"content-type": "application/json"},
            )
        if "api.telegram.org/file/" in url:
            return MockResponse(content=image_bytes, headers={"content-type": "image/jpeg"})
        raise RuntimeError("unexpected URL")

    monkeypatch.setattr("app.service.telegram_service.requests.get", fake_get)

    photo_update = {
        "message": {
            "chat": {"id": 7001, "type": "private"},
            "from": {"id": 900},
            "caption": "captura enviada por telegram",
            "photo": [
                {"file_id": "photo-file-small", "file_size": 128},
                {"file_id": "photo-file-main", "file_size": 2048},
            ],
        }
    }
    webhook_response = client.post("/telegram/webhook", json=photo_update)
    assert webhook_response.status_code == 200
    assert webhook_response.json()["handled"] is True
    assert webhook_response.json()["item_type"] == "IMAGE"

    listed = client.get("/inbox", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    item = listed.json()[0]
    assert item["source"] == "telegram"
    assert item["item_type"] == "IMAGE"
    assert item["content"] == "captura enviada por telegram"
    assert item["preview_base64"].startswith("data:image/jpeg;base64,")
    assert item["metadata_json"]["telegram_file_id"] == "photo-file-main"


def test_telegram_webhook_secret_validation(client, monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_WEBHOOK_SECRET", "secret-abc")

    unauthorized = client.post("/telegram/webhook", json={})
    assert unauthorized.status_code == 401
    assert unauthorized.json()["detail"] == "Webhook de Telegram no autorizado"

    authorized = client.post(
        "/telegram/webhook",
        json={},
        headers={"X-Telegram-Bot-Api-Secret-Token": "secret-abc"},
    )
    assert authorized.status_code == 200
    assert authorized.json()["handled"] is False
