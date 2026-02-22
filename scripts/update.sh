#!/usr/bin/env bash
# ===========================================
# AIMall — به‌روزرسانی پروژه روی سرور (بدون از دست دادن داده)
# استفاده: ./scripts/update.sh
# ===========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

[ -d .git ] || { log_warn "پوشهٔ .git یافت نشد؛ احتمالاً کلون نشده. به‌روزرسانی رد شد."; exit 0; }

# فایل تولیدشده را حذف و حذف را stage کن تا git pull با حذف آن در ریپو conflict نگیرد
rm -f "$PROJECT_ROOT/frontend/public/release.json"
(cd "$PROJECT_ROOT" && git add frontend/public/release.json 2>/dev/null || true)

log_info "دریافت آخرین تغییرات از Git..."
git fetch origin
if ! git pull --rebase origin main 2>/dev/null; then
  if ! git pull origin main 2>/dev/null; then
    log_warn "pull به‌خاطر release.json ناموفق بود؛ یک‌بار با reset سخت هم‌خوان می‌کنیم..."
    git reset --hard origin/main
  fi
fi

# روی سرورهای کم‌حافظه (مثلاً ۱GB RAM) ممکن است npm ci با Killed (OOM) تمام شود.
# اول npm ci را امتحان می‌کنیم؛ اگر خروجی 137/134 بود با npm install دوباره تلاش می‌کنیم.
npm_install() {
  local dir="$1"
  local name="$2"
  (cd "$dir" && npm ci --no-audit --no-fund) || true
  local ret=$?
  if [ "$ret" -eq 0 ]; then return 0; fi
  if [ "$ret" -eq 137 ] || [ "$ret" -eq 134 ] || [ "$ret" -eq 130 ]; then
    log_warn "نصب $name با npm ci قطع شد (احتمالاً کمبود RAM). تلاش با npm install..."
    (cd "$dir" && npm install --no-audit --no-fund) && return 0
  fi
  return $ret
}

log_info "نصب وابستگی‌های Backend..."
npm_install "$PROJECT_ROOT/backend" "Backend" || { log_warn "نصب Backend ناموفق."; exit 1; }
log_info "نصب وابستگی‌های Frontend..."
npm_install "$PROJECT_ROOT/frontend" "Frontend" || { log_warn "نصب Frontend ناموفق."; exit 1; }

log_info "Prisma generate و migrate..."
(cd "$PROJECT_ROOT/backend" && npm run prisma:generate) || { log_warn "prisma generate خطا داد."; exit 1; }
(cd "$PROJECT_ROOT/backend" && npm run prisma:migrate:deploy) || log_warn "migrate deploy خطا داد."

log_info "Build Backend..."
(cd "$PROJECT_ROOT/backend" && (npm run build:prod 2>/dev/null || (rm -rf dist && npm run build)))

log_info "Build Frontend (پاک‌سازی .next برای بیلد تمیز)..."
(cd "$PROJECT_ROOT/frontend" && rm -rf .next && npm run build)

RELEASE_ID=$(git rev-parse --short HEAD 2>/dev/null || echo "build-$(date +%Y%m%d%H%M)")
echo "{\"releaseId\":\"$RELEASE_ID\"}" > "$PROJECT_ROOT/frontend/public/release.json"
log_info "Release ID نوشته شد: $RELEASE_ID → frontend/public/release.json"
if [ -f "$PROJECT_ROOT/frontend/public/release.json" ]; then
  cat "$PROJECT_ROOT/frontend/public/release.json"
fi

if command -v pm2 &>/dev/null; then
  log_info "ری‌استارت سرویس‌های PM2 (از مسیر همین پروژه)..."
  cd "$PROJECT_ROOT"
  pm2 delete aimall-backend 2>/dev/null || true
  pm2 delete aimall-frontend 2>/dev/null || true
  pm2 start ecosystem.config.cjs
  pm2 save
  log_info "به‌روزرسانی تمام شد. (Release: $RELEASE_ID)"
  echo ""
  log_info "اگر در مرورگر تغییری ندیدید:"
  echo "  ۱) Hard Refresh: Ctrl+Shift+R (یا Cmd+Shift+R)"
  echo "  ۲) اگر از Cloudflare استفاده می‌کنید: داشبورد Cloudflare → Caching → Purge Everything"
else
  log_warn "PM2 یافت نشد. Backend و Frontend را دستی ری‌استارت کنید."
fi
