# Deploy - Portainer

Guía de despliegue del stack en Portainer usando imágenes Docker publicadas.

## Servicios
- `api`: backend FastAPI
- `frontend`: app React servida por Nginx

## Archivos
- `deploy/stack.yml`: definición del stack
- `deploy/env/stack.env.example`: plantilla de variables
- `backend/Dockerfile`: imagen backend
- `backend/docker/entrypoint.sh`: migraciones + arranque backend
- `frontend/Dockerfile`: build frontend + runtime Nginx
- `frontend/nginx/default.conf`: proxy `/api/*` -> `api:8000`

## 1) Publicar imágenes
El pipeline publica imágenes en Docker Hub:
- `docker.io/minix16/remit-backend:<tag>`
- `docker.io/minix16/remit-frontend:<tag>`

Secreto requerido en GitHub:
- `DOCKERHUB_TOKEN`

Workflow:
- `.github/workflows/build-and-push.yml`

## 2) Crear stack en Portainer
1. Crear un stack nuevo.
2. Cargar `deploy/stack.yml`.
3. Cargar variables desde `deploy/env/stack.env.example`.
4. Definir como mínimo:
   - `BACKEND_IMAGE`
   - `FRONTEND_IMAGE`
   - `DATABASE_URL`
5. Desplegar.

## 3) Verificación
- Frontend: `http://<NAS-IP>:<HOST_FRONTEND_PORT>`
- API directa: `http://<NAS-IP>:<HOST_API_PORT>`
- API proxy frontend: `http://<NAS-IP>:<HOST_FRONTEND_PORT>/api`
- Health: `http://<NAS-IP>:<HOST_API_PORT>/health`
- Docs: `http://<NAS-IP>:<HOST_API_PORT>/docs`

## Notas
- La extensión no forma parte del stack de Portainer; se distribuye aparte.
- Las migraciones se ejecutan al arrancar el backend (`entrypoint.sh`).
- El frontend consume backend por proxy `/api` para evitar problemas de CORS.
