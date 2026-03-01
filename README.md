# HackUDC 2026 - Remit (Kelea Digital Brain)

Proyecto hackathon con 3 piezas:
- `backend/` FastAPI + SQLite
- `frontend/` React + Vite
- `extension/` Chrome/Opera extension

## Despliegue
- App (produccion): `http://remit.mintos.space/`

## Requisitos
- Python 3.11+
- Node.js 20+
- Google Chrome u Opera

## 1) Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Backend disponible en:
- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

Variables importantes (`backend/.env`):
- `DATABASE_URL` (por defecto sqlite local)
- `CORS_ORIGINS` (incluye localhost:5173 para frontend)
- `JWT_SECRET_KEY`
- `GROQ_API_KEY` (si usas clasificación con LLM)
- `ALLOW_INSECURE_SSL_FETCH` (ponlo en `true` solo si necesitas descargar URLs con certificado roto)

## 2) Frontend
```powershell
cd frontend
npm install
npm run dev
```

Frontend en:
- `http://localhost:5173`

## 3) Extensión (Chrome/Opera)
1. Abre `chrome://extensions` o `opera://extensions`
2. Activa **Developer mode**
3. Pulsa **Load unpacked**
4. Selecciona la carpeta `extension/`
5. Si cambias código: pulsa **Reload** en la extensión

## Flujo mínimo de prueba
1. Arranca backend
2. Arranca frontend
3. Carga la extensión
4. Regístrate / login
5. Guarda contenido desde web/YouTube con la extensión
6. Revisa en frontend: `Principal`, `Novedades`, `Prioridad`, `Mapa`, `Ciudades`

## Problemas comunes
- Error `vite is not recognized`:
  - Ejecuta `npm install` dentro de `frontend/`

- Error `no such column: inboxitem.is_pinned`:
  - Ejecuta `alembic upgrade head` en `backend/`

- CORS desde frontend/extensión:
  - Revisa `CORS_ORIGINS` en `backend/.env`
