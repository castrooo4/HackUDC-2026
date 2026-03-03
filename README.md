# Remit - HackUDC 2026

![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Chrome Extension](https://img.shields.io/badge/Extension-MV3-4285F4?logo=googlechrome&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)

Remit es un "second brain" con tres piezas:
- `backend/`: API FastAPI + persistencia SQLite
- `frontend/`: aplicación React (Vite)
- `extension/`: extensión de navegador (Chrome/Opera, Manifest V3)

## Arquitectura
- La extensión captura contenido (texto, URLs, imágenes, PDFs, YouTube).
- El backend procesa y clasifica el contenido en el inbox.
- El frontend muestra, filtra, organiza y revisa prioridades.

## Requisitos
- Python `3.11+`
- Node.js `20+`
- Google Chrome u Opera

## Inicio rápido local

### 1) Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```
Backend:
- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

### 2) Frontend
```powershell
cd frontend
npm install
npm run dev
```
Frontend:
- Web: `http://127.0.0.1:5173`

Si necesitas cambiar la API:
```powershell
Copy-Item .env.example .env
# editar VITE_API_BASE
npm run dev
```

### 3) Extensión
1. Abre `chrome://extensions` u `opera://extensions`
2. Activa `Developer mode`
3. Pulsa `Load unpacked`
4. Selecciona la carpeta `extension/`

Configuración central: `extension/config.js`
- `API_BASE_URL`
- `WEB_APP_URL`
- `GEO_IP_URL`
- `ACTIVE_ENV` (`local` / `production`)

## Flujo de prueba recomendado
1. Inicia backend
2. Inicia frontend
3. Carga la extensión
4. Regístrate o inicia sesión
5. Guarda contenido desde web/YouTube
6. Verifica en vistas: `Principal`, `Novedades`, `Prioridad`, `Mapa`, `Ciudades`, `Merge`

## Variables importantes (backend/.env)
- `DATABASE_URL`
- `CORS_ORIGINS`
- `JWT_SECRET_KEY`
- `GROQ_API_KEY` (opcional, clasificación LLM)
- `ALLOW_INSECURE_SSL_FETCH` (solo para entornos controlados)

## Despliegue
- App web (producción): `https://remit.mintos.space/`
- Guía de stack Docker/Portainer: [deploy/README.md](deploy/README.md)

## Documentación por módulo
- Backend: [backend/README.md](backend/README.md)
- Frontend: [frontend/README.md](frontend/README.md)
- Deploy: [deploy/README.md](deploy/README.md)
