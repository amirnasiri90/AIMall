# راه‌اندازی PostgreSQL محلی برای توسعه (بدون Docker)
# ابتدا یک بار init و مایگریشن را اجرا کنید؛ بعد فقط این اسکریپت را برای استارت سرور بزنید.

$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $BackendRoot) { $BackendRoot = Join-Path (Get-Location) "backend" }
$Bin = Join-Path $BackendRoot "node_modules\@embedded-postgres\windows-x64\native\bin"
$DataDir = Join-Path $BackendRoot "data\pg"

if (-not (Test-Path (Join-Path $DataDir "postgresql.conf"))) {
    Write-Host "First-time init: creating database cluster with locale C..."
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    $pwFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $pwFile -Value "postgres" -NoNewline
    $env:LC_ALL = "C"
    & (Join-Path $Bin "initdb.exe") --pgdata=$DataDir --auth=password --username=postgres --pwfile=$pwFile --locale=C
    Remove-Item $pwFile -ErrorAction SilentlyContinue
    Write-Host "Cluster created. Start Postgres, then run: npx prisma migrate deploy && npx ts-node prisma/seed.ts"
}

$pg = Get-Process -Name "postgres" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*embedded-postgres*" }
if ($pg) {
    Write-Host "PostgreSQL is already running (PID $($pg.Id))."
    exit 0
}

Write-Host "Starting PostgreSQL on port 15432..."
Start-Process -FilePath (Join-Path $Bin "postgres.exe") -ArgumentList "-D", $DataDir, "-p", "15432" -WindowStyle Hidden
Start-Sleep -Seconds 2
Write-Host "PostgreSQL started. DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:15432/aimall?schema=public"
Write-Host "To stop: Get-Process postgres | Where Path -like '*embedded-postgres*' | Stop-Process"
