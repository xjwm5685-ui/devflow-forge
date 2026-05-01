Write-Host "================================"
Write-Host "  DevFlow Forge - Setup"
Write-Host "================================"
Write-Host ""

Write-Host "[1/5] Installing dependencies..."
pnpm install

Write-Host ""
Write-Host "[2/5] Creating config files..."
if (-not (Test-Path "packages/db/.env")) {
  'DATABASE_URL="file:./devflow.db"' | Out-File -FilePath "packages/db/.env" -Encoding utf8 -NoNewline
  Write-Host "  Created packages/db/.env"
} else {
  Write-Host "  packages/db/.env exists, skipping"
}
if (-not (Test-Path "apps/web/.env.local")) {
  Copy-Item ".env.example" "apps/web/.env.local"
  Write-Host "  Created apps/web/.env.local"
} else {
  Write-Host "  apps/web/.env.local exists, skipping"
}

Write-Host ""
Write-Host "[3/5] Initializing database..."
Push-Location packages/db
npx prisma db push --accept-data-loss
Pop-Location

Write-Host ""
Write-Host "[4/5] Seeding demo data..."
Push-Location packages/db
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
Write-Host "  pnpm dev"
Write-Host "  http://localhost:3000"
Write-Host ""
