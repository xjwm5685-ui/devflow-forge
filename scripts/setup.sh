#!/bin/bash
set -e

echo "================================"
echo "  DevFlow Forge - Setup"
echo "================================"
echo ""

if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is required. Install with: npm install -g pnpm"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ required. Current: $(node -v)"
  exit 1
fi

echo "[1/5] Installing dependencies..."
pnpm install

echo ""
echo "[2/5] Creating config files..."
# packages/db/.env (for Prisma CLI)
if [ ! -f packages/db/.env ]; then
  echo 'DATABASE_URL="file:./devflow.db"' > packages/db/.env
  echo "  Created packages/db/.env"
else
  echo "  packages/db/.env exists, skipping"
fi
# apps/web/.env.local (for Next.js)
if [ ! -f apps/web/.env.local ]; then
  cp .env.example apps/web/.env.local
  echo "  Created apps/web/.env.local"
else
  echo "  apps/web/.env.local exists, skipping"
fi

echo ""
echo "[3/5] Initializing database..."
cd packages/db && pnpm exec prisma db push --accept-data-loss && cd ../..

echo ""
echo "[4/5] Seeding demo data..."
cd packages/db && pnpm exec tsx prisma/seed.ts && cd ../..

echo ""
echo "[5/5] Copying database to web app..."
cp packages/db/prisma/devflow.db apps/web/devflow.db

echo ""
echo "================================"
echo "  Setup complete!"
echo "================================"
echo ""
echo "  pnpm dev"
echo "  http://localhost:3000"
echo ""
