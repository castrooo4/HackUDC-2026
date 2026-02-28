#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 0 ]; then
  echo "Este script no acepta argumentos."
  echo "Usa variables de entorno si quieres personalizar (ej: IMAGE_TAG=main ./build_and_push.sh)."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker no está instalado o no está en PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: no hay conexión con el daemon de Docker."
  echo "Asegúrate de que Docker esté levantado y de tener permisos."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: este directorio no parece ser un repositorio git."
  exit 1
fi

REGISTRY="${DOCKER_REGISTRY:-docker.io}"
DOCKERHUB_USER="${DOCKERHUB_USER:-minix16}"
BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || date +%s)"

if [ -z "${IMAGE_TAG:-}" ]; then
  if [ "$BRANCH_NAME" = "HEAD" ] || [ -z "$BRANCH_NAME" ]; then
    IMAGE_TAG="sha-${SHORT_SHA}"
  else
    IMAGE_TAG="${BRANCH_NAME//\//-}"
  fi
fi

PLATFORMS="${DOCKER_PLATFORMS:-linux/amd64,linux/arm64}"
PUSH_LATEST="${PUSH_LATEST:-false}"

BACKEND_IMAGE="${BACKEND_IMAGE:-${REGISTRY}/${DOCKERHUB_USER}/remit-backend:${IMAGE_TAG}}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-${REGISTRY}/${DOCKERHUB_USER}/remit-frontend:${IMAGE_TAG}}"

BACKEND_LATEST="${REGISTRY}/${DOCKERHUB_USER}/remit-backend:latest"
FRONTEND_LATEST="${REGISTRY}/${DOCKERHUB_USER}/remit-frontend:latest"

echo "==> Configuración"
echo "Registro:             ${REGISTRY}"
echo "Usuario Docker Hub:   ${DOCKERHUB_USER}"
echo "Tag:                  ${IMAGE_TAG}"
echo "Plataformas:          ${PLATFORMS}"
echo "Backend image:        ${BACKEND_IMAGE}"
echo "Frontend image:       ${FRONTEND_IMAGE}"
echo "Push latest:          ${PUSH_LATEST}"
echo

if ! docker buildx version >/dev/null 2>&1; then
  echo "Error: docker buildx no está disponible."
  exit 1
fi

BUILDER_NAME="${DOCKER_BUILDER_NAME:-remit-builder}"
if ! docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
  docker buildx create --name "$BUILDER_NAME" --use >/dev/null
else
  docker buildx use "$BUILDER_NAME" >/dev/null
fi
docker buildx inspect --bootstrap >/dev/null

echo "==> Construyendo y publicando backend..."
BACKEND_TAG_ARGS=(-t "$BACKEND_IMAGE")
if [ "${PUSH_LATEST}" = "true" ]; then
  BACKEND_TAG_ARGS+=(-t "$BACKEND_LATEST")
fi
docker buildx build \
  --platform "$PLATFORMS" \
  -f backend/Dockerfile \
  "${BACKEND_TAG_ARGS[@]}" \
  --push \
  backend

echo "==> Construyendo y publicando frontend..."
FRONTEND_TAG_ARGS=(-t "$FRONTEND_IMAGE")
if [ "${PUSH_LATEST}" = "true" ]; then
  FRONTEND_TAG_ARGS+=(-t "$FRONTEND_LATEST")
fi
docker buildx build \
  --platform "$PLATFORMS" \
  -f frontend/Dockerfile \
  "${FRONTEND_TAG_ARGS[@]}" \
  --push \
  frontend

echo
echo "Listo. Imágenes publicadas:"
echo "- ${BACKEND_IMAGE}"
echo "- ${FRONTEND_IMAGE}"
if [ "${PUSH_LATEST}" = "true" ]; then
  echo "- ${BACKEND_LATEST}"
  echo "- ${FRONTEND_LATEST}"
fi
