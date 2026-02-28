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


def test_inbox_requires_auth(client):
    response = client.post("/inbox", json={"item_type": "TEXT", "content": "sin auth"})
    assert response.status_code == 401


def test_create_text_item(client, auth_headers):
    payload = {
        "source": "extension",
        "item_type": "TEXT",
        "content": "nota rapida para validar flujo de texto",
    }
    response = client.post("/inbox", json=payload, headers=auth_headers)
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "TEXT"
    assert data["status"] == "PROCESSED"
    assert data["directory_id"] is not None
    assert data["title"]
    assert data["preview_base64"] is None
    assert data["metadata_json"]["preview_kind"] == "text"


def test_create_youtube_item(client, monkeypatch, auth_headers):
    thumbnail = _build_png_bytes(1280, 720)
    watch_html = """
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context":"https://schema.org",
          "@type":"VideoObject",
          "name":"Video de prueba FastAPI",
          "description":"Guia de arquitectura backend para Kelea Digital Brain",
          "uploadDate":"2026-02-20",
          "duration":"PT12M34S",
          "thumbnailUrl":"https://img.youtube.com/vi/test/hqdefault.jpg",
          "author":{"@type":"Person","name":"Canal Demo"}
        }
        </script>
        <meta name="keywords" content="fastapi,backend,arquitectura,python" />
        <meta itemprop="interactionCount" content="123456" />
      </head>
      <body></body>
    </html>
    """

    def fake_get(url, timeout=8):
        if "youtube.com/oembed" in url:
            return MockResponse(
                json_data={
                    "title": "Video de prueba FastAPI",
                    "author_name": "Canal Demo",
                    "thumbnail_url": "https://img.youtube.com/vi/test/hqdefault.jpg",
                }
            )
        if "youtube.com/watch?v=test" in url:
            return MockResponse(text=watch_html, content=watch_html.encode("utf-8"))
        if "img.youtube.com" in url:
            return MockResponse(content=thumbnail, headers={"content-type": "image/jpeg"})
        raise RuntimeError("unexpected URL")

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    response = client.post(
        "/inbox",
        json={"source": "extension", "item_type": "YOUTUBE", "url": "https://youtu.be/test"},
        headers=auth_headers,
    )
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "YOUTUBE"
    assert data["status"] == "PROCESSED"
    assert data["directory_id"] is not None
    assert data["title"] == "Video de prueba FastAPI"
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")
    assert data["metadata_json"]["video_id"] == "test"
    assert data["metadata_json"]["channel_name"] == "Canal Demo"
    assert data["metadata_json"]["duration_iso8601"] == "PT12M34S"
    assert data["metadata_json"]["upload_date"] == "2026-02-20"
    assert "backend" in data["metadata_json"]["keywords"]
    assert data["metadata_json"]["view_count"] == 123456
    assert "arquitectura backend" in data["content"].lower()


def test_create_image_item_with_base64(client, auth_headers):
    image_bytes = _build_png_bytes(1024, 768)
    import base64

    payload = {
        "item_type": "IMAGE",
        "file_base64": "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii"),
    }
    response = client.post("/inbox", json=payload, headers=auth_headers)
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "IMAGE"
    assert data["status"] == "PROCESSED"
    assert data["directory_id"] is not None
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")
    assert data["metadata_json"]["width"] == 1024
    assert data["metadata_json"]["preview_width"] <= 560


def test_create_image_item_with_url(client, monkeypatch, auth_headers):
    image_bytes = _build_png_bytes(900, 600)

    def fake_get(url, timeout=8):
        assert "example.com/assets/cover.png" in url
        return MockResponse(content=image_bytes, headers={"content-type": "image/png"})

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    response = client.post(
        "/inbox",
        json={"item_type": "IMAGE", "url": "https://example.com/assets/cover.png"},
        headers=auth_headers,
    )
    data = response.json()
    assert response.status_code == 201
    assert data["title"] == "cover.png"
    assert data["status"] == "PROCESSED"
    assert data["directory_id"] is not None
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")


def test_create_pdf_item_with_base64(client, auth_headers):
    raw_pdf = _build_pdf_bytes()
    import base64

    payload = {
        "item_type": "PDF",
        "file_base64": "data:application/pdf;base64," + base64.b64encode(raw_pdf).decode("ascii"),
    }
    response = client.post("/inbox", json=payload, headers=auth_headers)
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "PDF"
    assert data["status"] == "PROCESSED"
    assert data["directory_id"] is not None
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")
    assert data["metadata_json"]["pages"] == 1


def test_create_web_item(client, monkeypatch, auth_headers):
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

    response = client.post(
        "/inbox",
        json={"item_type": "WEB", "url": "https://example.com"},
        headers=auth_headers,
    )
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "WEB"
    assert data["status"] == "PROCESSED"
    assert data["directory_id"] is not None
    assert data["title"] == "Example Domain"
    assert data["favicon_base64"].startswith("data:image/png;base64,")


def test_validations_by_item_type(client, auth_headers):
    missing_text = client.post("/inbox", json={"item_type": "TEXT"}, headers=auth_headers)
    missing_yt = client.post("/inbox", json={"item_type": "YOUTUBE"}, headers=auth_headers)
    missing_web = client.post("/inbox", json={"item_type": "WEB"}, headers=auth_headers)
    missing_image = client.post("/inbox", json={"item_type": "IMAGE"}, headers=auth_headers)
    missing_pdf = client.post("/inbox", json={"item_type": "PDF"}, headers=auth_headers)

    assert missing_text.status_code == 422
    assert missing_yt.status_code == 422
    assert missing_web.status_code == 422
    assert missing_image.status_code == 422
    assert missing_pdf.status_code == 422


def test_list_get_patch_delete_flow(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "item para prueba de CRUD"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    listed = client.get("/inbox", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    detailed = client.get(f"/inbox/{item_id}", headers=auth_headers)
    assert detailed.status_code == 200
    assert detailed.json()["id"] == item_id

    patched = client.patch(
        f"/inbox/{item_id}",
        json={"title": "Titulo actualizado", "content": "contenido actualizado"},
        headers=auth_headers,
    )
    assert patched.status_code == 200
    assert patched.json()["title"] == "Titulo actualizado"
    assert patched.json()["content"] == "contenido actualizado"

    deleted = client.delete(f"/inbox/{item_id}", headers=auth_headers)
    assert deleted.status_code == 204

    not_found = client.get(f"/inbox/{item_id}", headers=auth_headers)
    assert not_found.status_code == 404


def test_list_inbox_filter_by_status(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "item para filtrar por estado"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert created.json()["status"] == "PROCESSED"

    processed_list = client.get("/inbox?status=PROCESSED", headers=auth_headers)
    assert processed_list.status_code == 200
    assert any(item["id"] == item_id for item in processed_list.json())

    confirm = client.post(
        f"/inbox/{item_id}/confirm-organization",
        json={},
        headers=auth_headers,
    )
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "ORGANIZED"

    organized_list = client.get("/inbox?status=ORGANIZED", headers=auth_headers)
    assert organized_list.status_code == 200
    assert any(item["id"] == item_id for item in organized_list.json())

    processed_list_after = client.get("/inbox?status=PROCESSED", headers=auth_headers)
    assert processed_list_after.status_code == 200
    assert all(item["id"] != item_id for item in processed_list_after.json())


def test_inbox_isolation_between_users(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "item del primer usuario"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    client.post(
        "/auth/register",
        json={"email": "second-user@example.com", "password": "StrongPass123"},
    )
    login = client.post(
        "/auth/login",
        json={"email": "second-user@example.com", "password": "StrongPass123"},
    )
    second_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    list_second = client.get("/inbox", headers=second_headers)
    assert list_second.status_code == 200
    assert list_second.json() == []

    get_second = client.get(f"/inbox/{item_id}", headers=second_headers)
    assert get_second.status_code == 404


def test_directory_tree_has_defaults(client, auth_headers):
    tree = client.get("/directories/tree", headers=auth_headers)
    assert tree.status_code == 200
    roots = tree.json()["roots"]
    root_names = {node["name"] for node in roots}
    assert {"Trabajo", "Personal", "Finanzas", "Documentos"}.issubset(root_names)


def test_confirm_organization_inbox_item(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "PDF", "file_base64": "data:application/pdf;base64,JVBERi0xLjcKJQ=="},
        headers=auth_headers,
    )
    # El base64 mínimo puede fallar parseo PDF, así que usamos uno válido si hace falta.
    if created.status_code != 201:
        raw_pdf = _build_pdf_bytes()
        import base64

        created = client.post(
            "/inbox",
            json={
                "item_type": "PDF",
                "file_base64": "data:application/pdf;base64," + base64.b64encode(raw_pdf).decode("ascii"),
            },
            headers=auth_headers,
        )
    assert created.status_code == 201
    item_id = created.json()["id"]

    organized = client.post(
        f"/inbox/{item_id}/confirm-organization",
        json={},
        headers=auth_headers,
    )
    assert organized.status_code == 200
    organized_data = organized.json()
    assert organized_data["directory_id"] is not None
    assert organized_data["status"] == "ORGANIZED"

    tree = client.get("/directories/tree", headers=auth_headers)
    assert tree.status_code == 200
    roots = tree.json()["roots"]
    assert any(item_id in node["item_ids"] for node in roots)


def test_confirm_organization_reuses_existing_directory_case_insensitive(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "nota breve del sprint"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    confirm = client.post(
        f"/inbox/{item_id}/confirm-organization",
        json={"directory_name": "trabajo"},
        headers=auth_headers,
    )
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "ORGANIZED"

    tree = client.get("/directories/tree", headers=auth_headers)
    roots = tree.json()["roots"]
    root_names = {node["name"] for node in roots}
    assert "Trabajo" in root_names
    assert "trabajo" not in root_names
    trabajo_node = next(node for node in roots if node["name"] == "Trabajo")
    assert item_id in trabajo_node["item_ids"]


def test_confirm_organization_fails_when_already_organized(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "item para confirmar dos veces"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    first = client.post(
        f"/inbox/{item_id}/confirm-organization",
        json={},
        headers=auth_headers,
    )
    assert first.status_code == 200

    second = client.post(
        f"/inbox/{item_id}/confirm-organization",
        json={},
        headers=auth_headers,
    )
    assert second.status_code == 409


def test_confirm_organization_creates_new_directory_when_user_selects_new(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "ideas de producto para comunidad"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    organized = client.post(
        f"/inbox/{item_id}/confirm-organization",
        json={"directory_name": "Innovacion"},
        headers=auth_headers,
    )
    assert organized.status_code == 200
    assert organized.json()["directory_id"] is not None
    assert organized.json()["status"] == "ORGANIZED"

    tree = client.get("/directories/tree", headers=auth_headers)
    roots = tree.json()["roots"]
    assert any(node["name"] == "Innovacion" and item_id in node["item_ids"] for node in roots)
