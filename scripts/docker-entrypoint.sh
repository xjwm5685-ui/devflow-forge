#!/bin/sh
set -e

DATA_DIR="${DATA_DIR:-/app/data}"
DB_FILE="${DATA_DIR}/devflow.db"

mkdir -p "$DATA_DIR"

export DATABASE_URL="file:${DB_FILE}"

if [ -f "$DB_FILE" ]; then
  echo "[devflow] Running prisma migrate deploy on ${DB_FILE} …"
  pnpm --filter @devflow/db exec prisma migrate deploy
else
  echo "[devflow] Initializing database with prisma db push …"
  pnpm --filter @devflow/db exec prisma db push --skip-generate
fi

HAS_PROJECTS=false
if pnpm --filter @devflow/db exec prisma db execute --stdin <<'SQL' >/dev/null 2>&1
SELECT 1 FROM Project LIMIT 1;
SQL
then
  HAS_PROJECTS=true
fi

if [ "$HAS_PROJECTS" = "false" ]; then
  echo "[devflow] Seeding initial demo data …"
  pnpm --filter @devflow/db run db:seed || echo "[devflow] Seed step skipped."
fi

ln -sf "$DB_FILE" /app/apps/web/devflow.db

echo "[devflow] Starting web app on ${HOST:-0.0.0.0}:${PORT:-3000}"
exec "$@"
