# Kelea Digital Brain - Backend Inbox

## Requisitos
- Python 3.11+

## Ejecutar
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env       # Windows PowerShell: Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Base URL: `http://127.0.0.1:8000`

## Docker (backend only)
```bash
cd backend
docker build -t remit-backend:local .
docker run --rm -p 8000:8000 \
  -v remit_sqlite_data:/data \
  -e DATABASE_URL=sqlite:////data/kelea.db \
  remit-backend:local
```

## Estructura (resumen)
- `app/routers`: endpoints (`inbox`, `health`)
- `app/service`: logica de negocio (ingesta por tipo)
- `app/classes`: clases de apoyo (resultado tipado de ingesta)
- `app/db`: engine y sessions
- `app/models`: SQLModel
- `app/schemas`: request/response
- `app/utils`: utilidades de preview/base64/imagenes

## Curl
```bash
# 1) Crear item
curl -X POST "http://127.0.0.1:8000/inbox" \
  -H "Content-Type: application/json" \
  -d "{\"source\":\"extension\",\"item_type\":\"TEXT\",\"content\":\"Nota rápida de prueba\"}"

# 2) Listar
curl "http://127.0.0.1:8000/inbox"

# 3) Obtener por id
curl "http://127.0.0.1:8000/inbox/1"

# 4) Actualizar (PATCH)
curl -X PATCH "http://127.0.0.1:8000/inbox/1" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Nuevo título\"}"

# 5) Eliminar
curl -X DELETE "http://127.0.0.1:8000/inbox/1"
```

## Endpoints
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /inbox`
- `GET /inbox`
- `GET /inbox/cities`
- `GET /inbox/cities/{city}/items`
- `GET /inbox/{id}`
- `GET /inbox/{id}/nearby`
- `POST /inbox/{id}/confirm-organization`
- `PATCH /inbox/{id}`
- `DELETE /inbox/{id}`
- `GET /directories/tree`
- `GET /health`

## Flujo de organizacion (nuevo)
1. Al crear un item (`POST /inbox`):
- se procesa automaticamente
- se calcula carpeta recomendada solo entre carpetas ya existentes del usuario
- se guarda `directory_id` recomendado
- el estado queda en `PROCESSED`

2. Confirmacion humana (`POST /inbox/{id}/confirm-organization`):
- acepta recomendado: `{}`
- seleccionar carpeta existente: `{"directory_id": 3}`
- cambiar/crear por nombre: `{"directory_name": "Arquitectura"}`
- al confirmar, pasa a `ORGANIZED`

3. Si intentas confirmar un item que no esta en `PROCESSED`, devuelve `409`.

## Pruebas en Postman (recomendado)

Request base:
- Method: `POST`
- URL: `http://127.0.0.1:8000/inbox`
- Headers: `Content-Type: application/json`
- Body: `raw` + `JSON`
- Header obligatorio para inbox: `Authorization: Bearer <access_token>`

## Auth (Postman)

### Register
- Method: `POST`
- URL: `http://127.0.0.1:8000/auth/register`
- Body (raw JSON):
```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "full_name": "User Demo"
}
```

### Login
- Method: `POST`
- URL: `http://127.0.0.1:8000/auth/login`
- Body (raw JSON):
```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```
Respuesta:
- `access_token`
- `token_type` (`bearer`)
- `expires_in`

Usa ese token en Postman para inbox:
- `Authorization` tab -> Type: `Bearer Token` -> pega `access_token`

### POST /inbox (campos)
- `source` (opcional): origen, por ejemplo `extension`, `web`.
- `item_type` (opcional, default `TEXT`): `TEXT`, `YOUTUBE`, `IMAGE`, `PDF`, `WEB`.
- `title` (opcional): si no llega, se autogenera según el tipo.
- `content` (segun tipo): obligatorio en `TEXT`, opcional en otros.
- `url` (segun tipo): obligatorio en `YOUTUBE` y `WEB`; opcional en `IMAGE` y `PDF`.
- `file_base64` (segun tipo): permitido en `IMAGE` y `PDF`.
- `mime_type` (opcional): útil cuando envías `file_base64`.
- `location_lat` (opcional): latitud en rango `[-90, 90]`.
- `location_lon` (opcional): longitud en rango `[-180, 180]`.
- `location_lat` y `location_lon` deben enviarse juntos.
- si envías coordenadas, el backend calcula y guarda `location_city` automáticamente.

### Caso 1: TEXT
Body:
```json
{
  "source": "extension",
  "item_type": "TEXT",
  "content": "nota rapida de arquitectura para frontend",
  "location_lat": 43.3623,
  "location_lon": -8.4115
}
```
Esperado en respuesta:
- `item_type = "TEXT"`
- `title` autogenerado si no lo envias
- `location_city` autogenerada si envias `location_lat` + `location_lon`
- `preview_base64 = null`

### Caso 2: YOUTUBE
Body:
```json
{
  "source": "extension",
  "item_type": "YOUTUBE",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```
Esperado en respuesta:
- `item_type = "YOUTUBE"`
- `preview_base64` con thumbnail en base64
- `metadata_json.video_id`

### Caso 3: IMAGE por URL
Body:
```json
{
  "source": "extension",
  "item_type": "IMAGE",
  "url": "https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg"
}
```
Esperado en respuesta:
- `item_type = "IMAGE"`
- `preview_base64` optimizada (miniatura)
- `metadata_json.preview_width`, `metadata_json.preview_height`

### Caso 4: IMAGE por base64
Body:
```json
{
  "source": "extension",
  "item_type": "IMAGE",
  "file_base64": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```
Esperado en respuesta:
- Igual que IMAGE por URL

### Caso 5: PDF por URL
Body:
```json
{
  "source": "extension",
  "item_type": "PDF",
  "url": "https://arxiv.org/pdf/1706.03762.pdf"
}
```
Esperado en respuesta:
- `item_type = "PDF"`
- `preview_base64` de primera pagina
- `metadata_json.pages`

### Caso 6: PDF por base64
Body:
```json
{
  "source": "extension",
  "item_type": "PDF",
  "file_base64": "data:application/pdf;base64,JVBERi0xLjcKJc..."
}
```
Esperado en respuesta:
- Igual que PDF por URL

### Caso 7: WEB
Body:
```json
{
  "source": "extension",
  "item_type": "WEB",
  "url": "https://example.com"
}
```
Esperado en respuesta:
- `item_type = "WEB"`
- `title` tomado del HTML (o fallback)
- `favicon_base64` si se encuentra icono

## Consultas de verificacion
- Listar: `GET http://127.0.0.1:8000/inbox`
- Listar filtrando estado: `GET http://127.0.0.1:8000/inbox?status=PROCESSED` (tambien `PENDING`, `ORGANIZED`)
- Listar filtrando por ciudad: `GET http://127.0.0.1:8000/inbox?city=A%20Coruna`
- Listar ciudades detectadas (para filtros UI): `GET http://127.0.0.1:8000/inbox/cities`
- Listar inbox de una ciudad concreta: `GET http://127.0.0.1:8000/inbox/cities/A%20Coruna/items`
- Cercanos por id: `GET http://127.0.0.1:8000/inbox/{id}/nearby?radius_km=25&limit=20`
- Detalle: `GET http://127.0.0.1:8000/inbox/{id}`
- Confirmar organizacion: `POST http://127.0.0.1:8000/inbox/{id}/confirm-organization`
- Ver arbol: `GET http://127.0.0.1:8000/directories/tree`
- Docs: `http://127.0.0.1:8000/docs`

## Tests
```bash
cd backend
python -m pytest -q
```


