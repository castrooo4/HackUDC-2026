# Kelea Digital Brain - Backend MVP

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

## Curl
```bash
# 1) Crear item
curl -X POST "http://127.0.0.1:8000/inbox" \
  -H "Content-Type: application/json" \
  -d "{\"source\":\"extension\",\"content\":\"Nota rápida de prueba\"}"

# 2) Listar
curl "http://127.0.0.1:8000/inbox"

# 3) Obtener por id
curl "http://127.0.0.1:8000/inbox/1"

# 4) Actualizar (PATCH)
curl -X PATCH "http://127.0.0.1:8000/inbox/1" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Nuevo título\",\"content\":\"Texto actualizado\"}"

# 5) Eliminar
curl -X DELETE "http://127.0.0.1:8000/inbox/1"
```
