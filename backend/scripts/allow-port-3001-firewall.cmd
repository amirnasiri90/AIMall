@echo off
:: Run as Administrator: right-click -> Run as administrator
netsh advfirewall firewall delete rule name="AIMall Backend API 3001" >nul 2>&1
netsh advfirewall firewall add rule name="AIMall Backend API 3001" dir=in action=allow protocol=TCP localport=3001
if %errorlevel% equ 0 (
    echo Port 3001 opened in Windows Firewall.
) else (
    echo Failed. Run this script as Administrator.
)
pause
