#!/bin/sh
set -eu

WAIT_FOR_DB_ATTEMPTS="${WAIT_FOR_DB_ATTEMPTS:-30}"
WAIT_FOR_DB_SLEEP_SECONDS="${WAIT_FOR_DB_SLEEP_SECONDS:-2}"

if [ -n "${DATABASE_URL:-}" ]; then
  case "$DATABASE_URL" in
    postgresql*|postgres*)
      echo "Waiting for PostgreSQL to be reachable..."
      attempt=1
      until python -c 'import os; from sqlalchemy import create_engine; create_engine(os.environ["DATABASE_URL"]).connect().close()' >/dev/null 2>&1
      do
        if [ "$attempt" -ge "$WAIT_FOR_DB_ATTEMPTS" ]; then
          echo "PostgreSQL is not reachable after ${WAIT_FOR_DB_ATTEMPTS} attempts."
          exit 1
        fi
        attempt=$((attempt + 1))
        sleep "$WAIT_FOR_DB_SLEEP_SECONDS"
      done
      ;;
  esac
fi

echo "Running migrations..."
alembic upgrade head

echo "Starting API..."
exec uvicorn app.main:app --host "${API_HOST:-0.0.0.0}" --port "${API_PORT:-8000}"
