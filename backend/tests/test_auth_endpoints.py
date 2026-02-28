def test_register_user_success(client):
    payload = {
        "email": "user1@example.com",
        "password": "StrongPass123",
        "full_name": "User One",
    }
    response = client.post("/auth/register", json=payload)
    data = response.json()

    assert response.status_code == 201
    assert data["email"] == "user1@example.com"
    assert data["full_name"] == "User One"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_user_duplicate_email(client):
    payload = {
        "email": "repeat@example.com",
        "password": "StrongPass123",
    }
    first = client.post("/auth/register", json=payload)
    second = client.post("/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "El email ya esta registrado"


def test_login_success(client):
    register_payload = {
        "email": "login@example.com",
        "password": "StrongPass123",
        "full_name": "Login User",
    }
    client.post("/auth/register", json=register_payload)

    response = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "StrongPass123"},
    )
    data = response.json()

    assert response.status_code == 200
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    assert data["access_token"]


def test_auth_me_success(client):
    client.post(
        "/auth/register",
        json={
            "email": "me@example.com",
            "password": "StrongPass123",
            "full_name": "User Me",
        },
    )
    login = client.post(
        "/auth/login",
        json={"email": "me@example.com", "password": "StrongPass123"},
    )
    token = login.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    data = me.json()

    assert me.status_code == 200
    assert data["email"] == "me@example.com"
    assert data["full_name"] == "User Me"
    assert data["is_active"] is True


def test_auth_me_unauthorized(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={"email": "wrongpass@example.com", "password": "StrongPass123"},
    )
    response = client.post(
        "/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrong"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales invalidas"


def test_login_unknown_user(client):
    response = client.post(
        "/auth/login",
        json={"email": "missing@example.com", "password": "StrongPass123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales invalidas"


def test_register_creates_default_directories(client):
    register = client.post(
        "/auth/register",
        json={
            "email": "dirs@example.com",
            "password": "StrongPass123",
            "full_name": "Dirs User",
        },
    )
    assert register.status_code == 201

    login = client.post(
        "/auth/login",
        json={"email": "dirs@example.com", "password": "StrongPass123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    tree = client.get("/directories/tree", headers={"Authorization": f"Bearer {token}"})
    assert tree.status_code == 200
    root_names = {node["name"] for node in tree.json()["roots"]}
    assert {"Trabajo", "Personal", "Finanzas", "Documentos"}.issubset(root_names)
