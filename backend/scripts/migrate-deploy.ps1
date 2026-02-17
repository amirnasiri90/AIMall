# Run Prisma migrations (PostgreSQL must be available).
# Option A: Set DATABASE_URL in .env and run:
#   npx prisma migrate deploy
# Option B: With Docker: start Postgres then run migrate deploy.
#   docker run -d --name aimall-pg -e POSTGRES_USER=aimall -e POSTGRES_PASSWORD=aimall -e POSTGRES_DB=aimall -p 5432:5432 postgres:16-alpine
#   $env:DATABASE_URL="postgresql://aimall:aimall@localhost:5432/aimall?schema=public"; npx prisma migrate deploy; npx ts-node prisma/seed.ts

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not $env:DATABASE_URL) {
    if (Test-Path ".env") {
        Get-Content ".env" | ForEach-Object { if ($_ -match '^\s*DATABASE_URL=(.+)$') { $env:DATABASE_URL = $matches[1].Trim().Trim('"').Trim("'") } }
    }
}

if (-not $env:DATABASE_URL -or $env:DATABASE_URL -notmatch "postgresql") {
    Write-Host "DATABASE_URL (PostgreSQL) is not set. Add it to .env or set the env var, then run:" -ForegroundColor Yellow
    Write-Host '  npx prisma migrate deploy' -ForegroundColor Cyan
    Write-Host '  npx ts-node prisma/seed.ts' -ForegroundColor Cyan
    exit 1
}

Write-Host "Running Prisma migrate deploy..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Running seed..."
npx ts-node prisma/seed.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done." -ForegroundColor Green
