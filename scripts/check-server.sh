#!/usr/bin/env bash
# ===========================================
# AIMall — تشخیص سریع: چرا سایت بالا نمی‌آید؟
# استفاده روی سرور: ./scripts/check-server.sh
# ===========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "=== وضعیت PM2 ==="
if command -v pm2 &>/dev/null; then
  pm2 list 2>/dev/null || true
  (pm2 list 2>/dev/null | grep -q "aimall-backend.*online")   && ok "aimall-backend در حال اجرا"   || fail "aimall-backend آنلاین نیست"
  (pm2 list 2>/dev/null | grep -q "aimall-frontend.*online")  && ok "aimall-frontend در حال اجرا"  || fail "aimall-frontend آنلاین نیست"
else
  warn "PM2 نصب نیست یا در PATH نیست"
fi

echo ""
echo "=== پورت‌های 3000 و 3001 ==="
for port in 3000 3001; do
  if ss -tlnp 2>/dev/null | grep -q ":$port "; then
    ok "پورت $port در حال گوش دادن است"
  else
    fail "پورت $port گوش نمی‌دهد"
  fi
done

echo ""
echo "=== تست مستقیم فرانت (localhost:3000) ==="
FRONT_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:3000/ 2>/dev/null || echo "000")
if [ "$FRONT_CODE" = "200" ] || [ "$FRONT_CODE" = "304" ]; then
  ok "فرانت جواب می‌دهد (HTTP $FRONT_CODE)"
else
  fail "فرانت جواب نداد یا خطا (کد: $FRONT_CODE)"
fi

echo ""
echo "=== تست مستقیم بک‌اند (localhost:3001) ==="
BACK_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:3001/api/v1/health 2>/dev/null || echo "000")
if [ "$BACK_CODE" = "200" ]; then
  ok "بک‌اند /api/v1/health جواب می‌دهد (HTTP 200)"
else
  fail "بک‌اند جواب نداد یا خطا (کد: $BACK_CODE). اگر 000 است، سرویس خاموش یا کرش است."
fi

echo ""
echo "=== Nginx (اگر نصب است) ==="
if command -v nginx &>/dev/null; then
  if nginx -t 2>/dev/null; then
    ok "تنظیمات Nginx سالم است"
  else
    fail "nginx -t خطا داد"
  fi
else
  warn "Nginx نصب نیست یا در PATH نیست"
fi

echo ""
echo "=== فایل‌های لازم ==="
[ -f "$PROJECT_ROOT/backend/dist/main.js" ] && ok "backend/dist/main.js وجود دارد" || fail "backend/dist/main.js وجود ندارد (بک‌اند را build کن)"
[ -d "$PROJECT_ROOT/frontend/.next" ]       && ok "frontend/.next وجود دارد"    || fail "frontend/.next وجود ندارد (فرانت را build کن)"

echo ""
echo "=== آخرین خطاهای PM2 (اگر هست) ==="
if command -v pm2 &>/dev/null; then
  pm2 logs --nostream --err --lines 5 2>/dev/null || true
fi
echo ""
echo "اگر همه [OK] بود ولی از بیرون سایت باز نمی‌شود: فایروال (ufw)، Nginx و DNS/Cloudflare را چک کنید."
