from io import BytesIO

import fitz
from PIL import Image


class MockResponse:
    def __init__(self, *, status_code=200, json_data=None, content=b"", text="", headers=None):
        self.status_code = status_code
        self._json_data = json_data
        self.content = content
        self.text = text
        self.headers = headers or {}
        self.ok = 200 <= status_code < 300

    def raise_for_status(self):
        if not self.ok:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._json_data


def _build_png_bytes(width=240, height=120, color=(30, 144, 255)):
    image = Image.new("RGB", (width, height), color=color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _build_pdf_bytes():
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Kelea PDF test content")
    raw = document.tobytes()
    document.close()
    return raw


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_create_text_item(client):
    payload = {
        "source": "extension",
        "item_type": "TEXT",
        "content": "nota rapida para validar flujo de texto",
    }
    response = client.post("/inbox", json=payload)
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "TEXT"
    assert data["title"]
    assert data["preview_base64"] is None
    assert data["metadata_json"]["preview_kind"] == "text"


def test_create_youtube_item(client, monkeypatch):
    thumbnail = _build_png_bytes(1280, 720)

    def fake_get(url, timeout=8):
        if "youtube.com/oembed" in url:
            return MockResponse(
                json_data={
                    "title": "Video de prueba FastAPI",
                    "author_name": "Canal Demo",
                    "thumbnail_url": "https://img.youtube.com/vi/test/hqdefault.jpg",
                }
            )
        if "img.youtube.com" in url:
            return MockResponse(content=thumbnail, headers={"content-type": "image/jpeg"})
        raise RuntimeError("unexpected URL")

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    response = client.post(
        "/inbox",
        json={"source": "extension", "item_type": "YOUTUBE", "url": "https://youtu.be/test"},
    )
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "YOUTUBE"
    assert data["title"] == "Video de prueba FastAPI"
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")
    assert data["metadata_json"]["video_id"] == "test"


def test_create_image_item_with_base64(client):
    image_bytes = _build_png_bytes(1024, 768)
    import base64

    payload = {
        "item_type": "IMAGE",
        "file_base64": "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii"),
    }
    response = client.post("/inbox", json=payload)
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "IMAGE"
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")
    assert data["metadata_json"]["width"] == 1024
    assert data["metadata_json"]["preview_width"] <= 560


def test_create_image_item_with_url(client, monkeypatch):
    image_bytes = _build_png_bytes(900, 600)

    def fake_get(url, timeout=8):
        assert "example.com/assets/cover.png" in url
        return MockResponse(content=image_bytes, headers={"content-type": "image/png"})

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    response = client.post(
        "/inbox",
        json={"item_type": "IMAGE", "url": "https://example.com/assets/cover.png"},
    )
    data = response.json()
    assert response.status_code == 201
    assert data["title"] == "cover.png"
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")


def test_create_pdf_item_with_base64(client):
    raw_pdf = _build_pdf_bytes()
    import base64

    payload = {
        "item_type": "PDF",
        "file_base64": "data:application/pdf;base64," + base64.b64encode(raw_pdf).decode("ascii"),
    }
    response = client.post("/inbox", json=payload)
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "PDF"
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")
    assert data["metadata_json"]["pages"] == 1


def test_create_web_item(client, monkeypatch):
    icon = _build_png_bytes(128, 128)

    def fake_get(url, timeout=8):
        if url == "https://example.com":
            html = (
                "<html><head><title>Example Domain</title>"
                "<link rel='icon' href='/favicon.ico'></head><body></body></html>"
            )
            return MockResponse(text=html, content=html.encode("utf-8"), headers={"content-type": "text/html"})
        if url == "https://example.com/favicon.ico":
            return MockResponse(content=icon, headers={"content-type": "image/x-icon"})
        raise RuntimeError("unexpected URL")

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    response = client.post("/inbox", json={"item_type": "WEB", "url": "https://example.com"})
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "WEB"
    assert data["title"] == "Example Domain"
    assert data["favicon_base64"].startswith("data:image/png;base64,")


def test_validations_by_item_type(client):
    missing_text = client.post("/inbox", json={"item_type": "TEXT"})
    missing_yt = client.post("/inbox", json={"item_type": "YOUTUBE"})
    missing_web = client.post("/inbox", json={"item_type": "WEB"})
    missing_image = client.post("/inbox", json={"item_type": "IMAGE"})
    missing_pdf = client.post("/inbox", json={"item_type": "PDF"})

    assert missing_text.status_code == 422
    assert missing_yt.status_code == 422
    assert missing_web.status_code == 422
    assert missing_image.status_code == 422
    assert missing_pdf.status_code == 422


def test_list_get_patch_delete_flow(client):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "item para prueba de CRUD"},
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    listed = client.get("/inbox")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    detailed = client.get(f"/inbox/{item_id}")
    assert detailed.status_code == 200
    assert detailed.json()["id"] == item_id

    patched = client.patch(
        f"/inbox/{item_id}",
        json={"title": "Titulo actualizado", "content": "contenido actualizado"},
    )
    assert patched.status_code == 200
    assert patched.json()["title"] == "Titulo actualizado"
    assert patched.json()["content"] == "contenido actualizado"

    deleted = client.delete(f"/inbox/{item_id}")
    assert deleted.status_code == 204

    not_found = client.get(f"/inbox/{item_id}")
    assert not_found.status_code == 404
