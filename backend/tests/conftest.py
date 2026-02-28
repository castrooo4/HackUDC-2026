import tempfile
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.db.database import get_session
from app.main import app


@pytest.fixture()
def client():
    temp_dir = tempfile.mkdtemp(prefix="kelea_test_")
    db_path = Path(temp_dir) / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture()
def auth_headers(client):
    register_payload = {
        "email": "inbox-user@example.com",
        "password": "StrongPass123",
        "full_name": "Inbox User",
    }
    client.post("/auth/register", json=register_payload)
    login_response = client.post(
        "/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_location_city_resolution(monkeypatch):
    def _fake_resolve_city(lat, lon):
        if lat is None or lon is None:
            return None
        if lat >= 43.0:
            return "A Coruna"
        if lat >= 42.0:
            return "Santiago de Compostela"
        return "Madrid"

    monkeypatch.setattr("app.routers.inbox.inbox_service.location_service.resolve_city", _fake_resolve_city)
