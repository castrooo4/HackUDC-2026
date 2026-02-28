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
        "location_lat": 43.3623,
        "location_lon": -8.4115,
    }
    response = client.post("/inbox", json=payload, headers=auth_headers)
    data = response.json()
    assert response.status_code == 201
    assert data["item_type"] == "TEXT"
    assert data["status"] == "PROCESSED"
    assert data["directory_id"] is not None
    assert data["location_lat"] == 43.3623
    assert data["location_lon"] == -8.4115
    assert data["location_city"] == "A Coruna"
    assert data["title"]
    assert data["preview_base64"] is None
    assert data["metadata_json"]["preview_kind"] == "text"


def test_create_inbox_with_location_in_body(client, auth_headers):
    response = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "ubicacion body",
            "location_lat": 43.1,
            "location_lon": -8.1,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["location_lat"] == 43.1
    assert data["location_lon"] == -8.1
    assert data["location_city"] == "A Coruna"


def test_create_inbox_requires_location_pair_in_body(client, auth_headers):
    response = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "falta lon", "location_lat": 43.2},
        headers=auth_headers,
    )
    assert response.status_code == 422


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


def test_patch_reingest_validates_type_requirements(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "item base"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    patched = client.patch(
        f"/inbox/{item_id}",
        json={"item_type": "YOUTUBE"},
        headers=auth_headers,
    )
    assert patched.status_code == 422


def test_patch_youtube_url_reingests_metadata(client, monkeypatch, auth_headers):
    thumb1 = _build_png_bytes(640, 360, color=(200, 10, 10))
    thumb2 = _build_png_bytes(640, 360, color=(10, 200, 10))

    def fake_get(url, timeout=8):
        if "youtube.com/oembed" in url and "test2" in url:
            return MockResponse(
                json_data={
                    "title": "Video test 2",
                    "author_name": "Canal Demo",
                    "thumbnail_url": "https://img.youtube.com/vi/test2/hqdefault.jpg",
                }
            )
        if "youtube.com/oembed" in url and "test" in url:
            return MockResponse(
                json_data={
                    "title": "Video test 1",
                    "author_name": "Canal Demo",
                    "thumbnail_url": "https://img.youtube.com/vi/test/hqdefault.jpg",
                }
            )
        if "youtube.com/watch?v=test2" in url:
            html = "<html><head><meta itemprop='interactionCount' content='200' /></head></html>"
            return MockResponse(text=html, content=html.encode("utf-8"))
        if "youtube.com/watch?v=test" in url:
            html = "<html><head><meta itemprop='interactionCount' content='100' /></head></html>"
            return MockResponse(text=html, content=html.encode("utf-8"))
        if "img.youtube.com/vi/test2" in url:
            return MockResponse(content=thumb2, headers={"content-type": "image/jpeg"})
        if "img.youtube.com/vi/test/" in url:
            return MockResponse(content=thumb1, headers={"content-type": "image/jpeg"})
        raise RuntimeError("unexpected URL")

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    created = client.post(
        "/inbox",
        json={"item_type": "YOUTUBE", "url": "https://youtu.be/test"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert created.json()["metadata_json"]["video_id"] == "test"

    patched = client.patch(
        f"/inbox/{item_id}",
        json={"url": "https://youtu.be/test2"},
        headers=auth_headers,
    )
    assert patched.status_code == 200
    data = patched.json()
    assert data["item_type"] == "YOUTUBE"
    assert data["url"] == "https://youtu.be/test2"
    assert data["metadata_json"]["video_id"] == "test2"
    assert data["title"] == "Video test 2"
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")


def test_patch_image_with_base64_reingests_preview(client, monkeypatch, auth_headers):
    image_url_bytes = _build_png_bytes(300, 200, color=(10, 10, 220))
    image_base64_bytes = _build_png_bytes(1024, 768, color=(220, 10, 10))

    def fake_get(url, timeout=8):
        return MockResponse(content=image_url_bytes, headers={"content-type": "image/png"})

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    created = client.post(
        "/inbox",
        json={"item_type": "IMAGE", "url": "https://example.com/old.png"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert created.json()["metadata_json"]["width"] == 300

    import base64

    patched = client.patch(
        f"/inbox/{item_id}",
        json={
            "file_base64": "data:image/png;base64," + base64.b64encode(image_base64_bytes).decode("ascii"),
            "mime_type": "image/png",
        },
        headers=auth_headers,
    )
    assert patched.status_code == 200
    data = patched.json()
    assert data["item_type"] == "IMAGE"
    assert data["metadata_json"]["width"] == 1024
    assert data["preview_base64"].startswith("data:image/jpeg;base64,")


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


def test_list_inbox_filter_by_city(client, auth_headers):
    coruna = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "item en coruna",
            "location_lat": 43.3623,
            "location_lon": -8.4115,
        },
        headers=auth_headers,
    )
    madrid = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "item en madrid",
            "location_lat": 40.4168,
            "location_lon": -3.7038,
        },
        headers=auth_headers,
    )
    assert coruna.status_code == 201
    assert madrid.status_code == 201
    coruna_id = coruna.json()["id"]
    madrid_id = madrid.json()["id"]

    filtered = client.get("/inbox?city=a coruna", headers=auth_headers)
    assert filtered.status_code == 200
    ids = [item["id"] for item in filtered.json()]
    assert coruna_id in ids
    assert madrid_id not in ids


def test_list_inbox_items_by_city_endpoint(client, auth_headers):
    coruna = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "city endpoint coruna",
            "location_lat": 43.3623,
            "location_lon": -8.4115,
        },
        headers=auth_headers,
    )
    madrid = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "city endpoint madrid",
            "location_lat": 40.4168,
            "location_lon": -3.7038,
        },
        headers=auth_headers,
    )
    assert coruna.status_code == 201
    assert madrid.status_code == 201

    filtered = client.get("/inbox/cities/A%20Coruna/items", headers=auth_headers)
    assert filtered.status_code == 200
    ids = [item["id"] for item in filtered.json()]
    assert coruna.json()["id"] in ids
    assert madrid.json()["id"] not in ids


def test_list_inbox_cities(client, auth_headers):
    first = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "uno",
            "location_lat": 43.3623,
            "location_lon": -8.4115,
        },
        headers=auth_headers,
    )
    second = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "dos",
            "location_lat": 43.27,
            "location_lon": -8.39,
        },
        headers=auth_headers,
    )
    third = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "tres",
            "location_lat": 40.4168,
            "location_lon": -3.7038,
        },
        headers=auth_headers,
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert third.status_code == 201

    cities = client.get("/inbox/cities", headers=auth_headers)
    assert cities.status_code == 200
    data = cities.json()
    assert {"city": "A Coruna", "item_count": 2} in data
    assert {"city": "Madrid", "item_count": 1} in data


def test_nearby_by_location_from_item(client, auth_headers):
    base = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "base coruna",
            "location_lat": 43.3623,
            "location_lon": -8.4115,
        },
        headers=auth_headers,
    )
    near = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "santiago",
            "location_lat": 42.8782,
            "location_lon": -8.5448,
        },
        headers=auth_headers,
    )
    far = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "madrid",
            "location_lat": 40.4168,
            "location_lon": -3.7038,
        },
        headers=auth_headers,
    )
    assert base.status_code == 201
    assert near.status_code == 201
    assert far.status_code == 201

    base_id = base.json()["id"]
    near_id = near.json()["id"]
    far_id = far.json()["id"]

    recommendations = client.get(
        f"/inbox/{base_id}/nearby?radius_km=80",
        headers=auth_headers,
    )
    assert recommendations.status_code == 200
    data = recommendations.json()
    ids = [row["item"]["id"] for row in data]
    assert near_id in ids
    assert far_id not in ids
    assert all("distance_km" in row for row in data)


def test_nearby_fail_if_base_item_has_no_location(client, auth_headers):
    base = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "sin ubicacion"},
        headers=auth_headers,
    )
    assert base.status_code == 201

    response = client.get(
        f"/inbox/{base.json()['id']}/nearby",
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_recommendations_endpoint_removed(client, auth_headers):
    base = client.post(
        "/inbox",
        json={
            "item_type": "TEXT",
            "content": "base",
            "location_lat": 43.3623,
            "location_lon": -8.4115,
        },
        headers=auth_headers,
    )
    assert base.status_code == 201
    response = client.get(f"/inbox/{base.json()['id']}/recommendations", headers=auth_headers)
    assert response.status_code == 404


def test_youtube_recommendations_endpoint(client, monkeypatch, auth_headers):
    thumb = _build_png_bytes(640, 360, color=(120, 200, 60))

    def fake_get(url, timeout=8):
        if "youtube.com/oembed" in url and "videoaaa11a1" in url:
            return MockResponse(
                json_data={
                    "title": "FastAPI arquitectura limpia",
                    "author_name": "Kelea Channel",
                    "thumbnail_url": "https://img.youtube.com/vi/videoaaa11a1/hqdefault.jpg",
                }
            )
        if "youtube.com/oembed" in url and "videobbb22b2" in url:
            return MockResponse(
                json_data={
                    "title": "Backend patterns para APIs",
                    "author_name": "Kelea Channel",
                    "thumbnail_url": "https://img.youtube.com/vi/videobbb22b2/hqdefault.jpg",
                }
            )
        if "youtube.com/watch?v=videoaaa11a1" in url:
            html = "<html><head><meta itemprop='interactionCount' content='101' /></head></html>"
            return MockResponse(text=html, content=html.encode("utf-8"))
        if "youtube.com/watch?v=videobbb22b2" in url:
            html = "<html><head><meta itemprop='interactionCount' content='202' /></head></html>"
            return MockResponse(text=html, content=html.encode("utf-8"))
        if "img.youtube.com" in url:
            return MockResponse(content=thumb, headers={"content-type": "image/jpeg"})
        raise RuntimeError(f"unexpected URL: {url}")

    monkeypatch.setattr("app.service.inbox_ingest_service.requests.get", fake_get)

    first = client.post(
        "/inbox",
        json={"item_type": "YOUTUBE", "url": "https://youtu.be/videoaaa11a1"},
        headers=auth_headers,
    )
    second = client.post(
        "/inbox",
        json={"item_type": "YOUTUBE", "url": "https://youtu.be/videobbb22b2"},
        headers=auth_headers,
    )
    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get(
        "/inbox/recommendations/youtube",
        params={
            "current_url": "https://youtu.be/videoaaa11a1",
            "current_title": "FastAPI arquitectura limpia",
            "current_channel": "Kelea Channel",
            "limit": 20,
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(row["item"]["item_type"] == "YOUTUBE" for row in data)
    assert any("videoaaa11a1" in (row["item"].get("url") or "") for row in data)
    assert any("videobbb22b2" in (row["item"].get("url") or "") for row in data)


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


def test_patch_allows_moving_item_to_existing_directory(client, auth_headers):
    created = client.post(
        "/inbox",
        json={"item_type": "TEXT", "content": "item para mover de carpeta"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]
    original_directory_id = created.json()["directory_id"]

    tree = client.get("/directories/tree", headers=auth_headers)
    assert tree.status_code == 200
    roots = tree.json()["roots"]
    assert roots

    target_directory_id = next((node["id"] for node in roots if node["id"] != original_directory_id), roots[0]["id"])

    moved = client.patch(
        f"/inbox/{item_id}",
        json={"directory_id": target_directory_id},
        headers=auth_headers,
    )
    assert moved.status_code == 200
    assert moved.json()["directory_id"] == target_directory_id
