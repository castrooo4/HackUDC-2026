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

## Estructura (resumen)
- `app/routers`: endpoints (`inbox`, `health`)
- `app/service`: logica de negocio (ingesta por tipo)
- `app/classes`: clases de apoyo (resultado tipado de ingesta)
- `app/db`: engine y sessions
- `app/models`: SQLModel
- `app/schemas`: request/response
- `app/utils`: utilidades de preview/base64/imagenes

## Endpoints
- `POST /inbox`
- `GET /inbox`
- `GET /inbox/{id}`
- `PATCH /inbox/{id}`
- `DELETE /inbox/{id}`
- `GET /health`

## Pruebas en Postman (recomendado)

Request base:
- Method: `POST`
- URL: `http://127.0.0.1:8000/inbox`
- Headers: `Content-Type: application/json`
- Body: `raw` + `JSON`

### Caso 1: TEXT
Body:
```json
{
  "source": "extension",
  "item_type": "TEXT",
  "content": "nota rapida de arquitectura para frontend"
}
```
Esperado en respuesta:
- `item_type = "TEXT"`
- `title` autogenerado si no lo envias
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
- Detalle: `GET http://127.0.0.1:8000/inbox/{id}`
- Docs: `http://127.0.0.1:8000/docs`

## Tests
```bash
cd backend
python -m pytest -q
```
