# اجرا با دسترسی Administrator برای باز کردن پورت 3001 در فایروال ویندوز
# Run PowerShell as Administrator, then: .\allow-port-3001-firewall.ps1

$ruleName = "AIMall Backend API 3001"
$port = 3001

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "لطفاً PowerShell را با دسترسی Administrator اجرا کنید." -ForegroundColor Yellow
    exit 1
}

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "قانون فایروال قبلاً وجود دارد. در حال حذف و ایجاد مجدد..." -ForegroundColor Cyan
    Remove-NetFirewallRule -DisplayName $ruleName
}

New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow
Write-Host "پورت $port برای اتصال از شبکه باز شد." -ForegroundColor Green
