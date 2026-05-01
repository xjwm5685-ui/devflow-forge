Write-Host "================================"
Write-Host "  DevFlow Forge - Setup"
Write-Host "================================"
Write-Host ""

# Check pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "Error: pnpm is required. Install with: npm install -g pnpm"
  exit 1
}

Write-Host "[1/5] Installing dependencies..."
pnpm install

Write-Host ""
Write-Host "[2/5] Creating .env.local..."
if (-not (Test-Path "apps/web/.env.local")) {
  Copy-Item ".env.example" "apps/web/.env.local"
  Write-Host "  Created apps/web/.env.local"
} else {
  Write-Host "  apps/web/.env.local already exists, skipping"
}

Write-Host ""
Write-Host "[3/5] Initializing database..."
Push-Location packages/db
$env:DATABASE_URL = "file:./devflow.db"
npx prisma db push --accept-data-loss
Pop-Location

Write-Host ""
Write-Host "[4/5] Seeding demo data..."
Push-Location packages/db
$env:DATABASE_URL = "file:./devflow.db"
npx tsx prisma/seed.ts
Pop-Location

Write-Host ""
Write-Host "[5/5] Copying database to web app..."
Copy-Item "packages/db/prisma/devflow.db" "apps/web/devflow.db" -Force

Write-Host ""
Write-Host "================================"
Write-Host "  Setup complete!"
Write-Host "================================"
Write-Host ""
Write-Host "Start the dev server:"
Write-Host "  pnpm dev"
Write-Host ""
Write-Host "Then open: http://localhost:3000"
