#!/usr/bin/env bash
# ===========================================
# AIMall — بررسی منابع سرور (CPU، رم، بار) و زمان پاسخ محلی
# برای تشخیص اینکه کندی از سرور است یا از شبکه/آروان
# استفاده روی سرور: ./scripts/check-server-resources.sh
# ===========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== بار سیستم (uptime) ==="
uptime
echo "  → اگر load average نزدیک یا بالاتر از تعداد هسته‌های CPU باشد، سرور تحت فشار است."
echo ""

echo "=== رم و سوئپ (free -h) ==="
free -h
echo "  → اگر Swap زیاد استفاده شود یا رم تقریباً پر باشد، احتمال کمبود منابع است."
echo ""

echo "=== PM2 (لیست سرویس‌ها) ==="
if command -v pm2 &>/dev/null; then
  pm2 list 2>/dev/null || true
else
  echo "  PM2 یافت نشد."
fi
echo ""

echo "=== زمان پاسخ محلی (بدون آروان) ==="
echo -n "  بک‌اند /api/v1/health: "
BACK_TIME=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 5 http://127.0.0.1:3001/api/v1/health 2>/dev/null || echo "0")
echo "${BACK_TIME}s"
echo -n "  فرانت /: "
FRONT_TIME=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 5 http://127.0.0.1:3000/ 2>/dev/null || echo "0")
echo "${FRONT_TIME}s"
echo "  → اگر این اعداد زیاد باشند (>۲ ثانیه)، مشکل از خود سرور است."
echo "  → برای مقایسه با آروان، از بیرون هم بزن: curl -o /dev/null -s -w \"time_total: %{time_total}s\\n\" https://دامنه-تو/api/v1/health"
echo ""
echo "جزئیات بیشتر: docs/DEPLOYMENT.md — بخش «تشخیص: سنگینی از منابع سرور است یا از ابر آروان»"
