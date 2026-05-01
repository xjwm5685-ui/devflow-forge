#!/bin/bash
set -e

echo "================================"
echo "  DevFlow Forge - Setup"
echo "================================"
echo ""

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is required. Install with: npm install -g pnpm"
  exit 1
fi

# Check Node
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ required. Current: $(node -v)"
  exit 1
fi

echo "[1/5] Installing dependencies..."
pnpm install

echo ""
echo "[2/5] Creating .env.local..."
if [ ! -f apps/web/.env.local ]; then
  cp .env.example apps/web/.env.local
  echo "  Created apps/web/.env.local from .env.example"
else
  echo "  apps/web/.env.local already exists, skipping"
fi

echo ""
echo "[3/5] Initializing database..."
cd packages/db
DATABASE_URL="file:./devflow.db" pnpm exec prisma db push --accept-data-loss
cd ../..

echo ""
echo "[4/5] Seeding demo data..."
cd packages/db
DATABASE_URL="file:./devflow.db" pnpm exec tsx prisma/seed.ts
cd ../..

echo ""
echo "[5/5] Copying database to web app..."
cp packages/db/prisma/devflow.db apps/web/devflow.db

echo ""
echo "================================"
echo "  Setup complete!"
echo "================================"
echo ""
echo "Start the dev server:"
echo "  pnpm dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "To configure a real LLM API, go to Settings in the app"
echo "or edit apps/web/.env.local directly."
echo ""
