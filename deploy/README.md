# Deployment (Portainer)

This project is prepared for remote deployment in Portainer with:
- `api`: FastAPI backend container (SQLite persisted in volume).
- `frontend`: React app served by Nginx.

## Files
- `deploy/stack.yml`: Stack definition for Portainer.
- `deploy/env/stack.env.example`: Environment variables template.
- `backend/Dockerfile`: Backend runtime image.
- `backend/docker/entrypoint.sh`: Migrations + API startup.
- `frontend/Dockerfile`: Frontend runtime image (Vite build + Nginx).
- `frontend/nginx/default.conf`: Reverse proxy `/api/*` -> `api:8000`.

## 1) Build and publish image
Push changes to `main` (or a release tag). CI publishes:
- `docker.io/minix16/remit-backend:<tag>`
- `docker.io/minix16/remit-frontend:<tag>`

Required GitHub secret for CI:
- `DOCKERHUB_TOKEN` (Docker Hub access token for user `minix16`)

Workflow file:
- `.github/workflows/build-and-push.yml`

## 2) Configure Portainer stack
1. In Portainer, create a new stack.
2. Use `deploy/stack.yml`.
3. Add env vars from `deploy/env/stack.env.example`.
4. Set at least:
   - `BACKEND_IMAGE`
   - `FRONTEND_IMAGE`
   - `DATABASE_URL` (SQLite file path in container)
5. Deploy the stack.

## 3) Access
- Frontend: `http://<NAS-IP>:<HOST_FRONTEND_PORT>`
- API (direct): `http://<NAS-IP>:<HOST_API_PORT>`
- API via frontend proxy: `http://<NAS-IP>:<HOST_FRONTEND_PORT>/api`
- Health backend: `http://<NAS-IP>:<HOST_API_PORT>/health`
- Docs backend: `http://<NAS-IP>:<HOST_API_PORT>/docs`

## Notes
- Browser extension is not a NAS containerized service. It is distributed/loaded separately.
- Migrations run automatically at container startup through `entrypoint.sh`.
- Frontend calls backend through `/api/*` on same origin (Nginx reverse proxy), avoiding CORS issues.
