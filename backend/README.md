# Backend - Remit

API principal para autenticación, ingestión de contenido y organización del inbox.

## Stack
- FastAPI
- SQLModel + SQLAlchemy
- Alembic
- SQLite (por defecto)

## Requisitos
- Python `3.11+`

## Ejecución local
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Accesos:
- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

## Variables de entorno clave
- `DATABASE_URL`: conexión a base de datos
- `CORS_ORIGINS`: orígenes permitidos
- `JWT_SECRET_KEY`: clave de firma JWT
- `ACCESS_TOKEN_EXPIRE_MINUTES`: expiración del token
- `GROQ_API_KEY`: habilita clasificación LLM (opcional)
- `ALLOW_INSECURE_SSL_FETCH`: usar solo en entornos controlados
- `INGEST_TIMEOUT_SECONDS`: timeout de fetch remotos en ingesta
- `INGEST_RETRY_DELAYS_SECONDS`: reintentos de reproceso en segundo plano (ej. `3,8,20`)

Soporte de override local:
- `backend/.env` (base)
- `backend/.env.local` (sobrescribe `.env`)

## Endpoints principales
Auth:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Inbox:
- `POST /inbox`
- `GET /inbox`
- `GET /inbox/{id}`
- `PATCH /inbox/{id}`
- `DELETE /inbox/{id}`
- `POST /inbox/{id}/confirm-organization`
- `GET /inbox/cities`
- `GET /inbox/cities/{city}/items`
- `GET /inbox/{id}/nearby`
- `GET /inbox/review/top`
- `GET /inbox/merge-suggestions`
- `POST /inbox/{id}/merge-apply`
- `POST /inbox/{id}/merge-reject`
- `POST /inbox/merge-history/{history_id}/revert`

Directorios:
- `GET /directories/tree`

## Estructura
- `app/routers`: definición de endpoints
- `app/service`: lógica de negocio
- `app/models`: entidades SQLModel
- `app/schemas`: request/response DTOs
- `app/db`: motor y sesión de BD
- `app/utils`: utilidades técnicas

## Tests
```powershell
cd backend
python -m pytest -q
```

## Docker (solo backend)
```powershell
cd backend
docker build -t remit-backend:local .
docker run --rm -p 8000:8000 -v remit_sqlite_data:/data -e DATABASE_URL=sqlite:////data/kelea.db remit-backend:local
```
