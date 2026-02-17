# اجرا با دسترسی Administrator برای باز کردن پورت‌های 3000 (فرانت) و 3001 (بک‌اند) در فایروال ویندوز
# Run PowerShell as Administrator, then: .\allow-ports-3000-3001-firewall.ps1

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "لطفاً PowerShell را با دسترسی Administrator اجرا کنید." -ForegroundColor Yellow
    exit 1
}

$rules = @(
    @{ Name = "AIMall Frontend 3000"; Port = 3000 },
    @{ Name = "AIMall Backend API 3001"; Port = 3001 }
)

foreach ($r in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "قانون '$($r.Name)' قبلاً وجود دارد. در حال حذف و ایجاد مجدد..." -ForegroundColor Cyan
        Remove-NetFirewallRule -DisplayName $r.Name
    }
    New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -LocalPort $r.Port -Protocol TCP -Action Allow
    Write-Host "پورت $($r.Port) برای اتصال از شبکه باز شد." -ForegroundColor Green
}
Write-Host "از سیستم‌های دیگر با http://YOUR_IP:3000 سایت را باز کنید." -ForegroundColor Cyan
