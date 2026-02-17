# توقف PostgreSQL محلی (همان که با start-local-pg.ps1 بالا آمد)
Get-Process -Name "postgres" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*embedded-postgres*" } | Stop-Process -Force
Write-Host "PostgreSQL stopped."
