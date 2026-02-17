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

log_info "دریافت آخرین تغییرات از Git..."
git pull --rebase || git pull || true

log_info "نصب وابستگی‌های Backend..."
(cd "$PROJECT_ROOT/backend" && npm ci --no-audit --no-fund)
log_info "نصب وابستگی‌های Frontend..."
(cd "$PROJECT_ROOT/frontend" && npm ci --no-audit --no-fund)

log_info "Prisma generate و migrate..."
(cd "$PROJECT_ROOT/backend" && npx prisma generate)
(cd "$PROJECT_ROOT/backend" && npx prisma migrate deploy) || log_warn "migrate deploy خطا داد."

log_info "Build Backend..."
(cd "$PROJECT_ROOT/backend" && (npm run build:prod 2>/dev/null || (rm -rf dist && npm run build)))

RELEASE_ID=$(git rev-parse --short HEAD 2>/dev/null || echo "build-$(date +%Y%m%d%H%M)")
echo "{\"releaseId\":\"$RELEASE_ID\"}" > "$PROJECT_ROOT/frontend/public/release.json"
log_info "Release ID: $RELEASE_ID"

log_info "Build Frontend (پاک‌سازی .next برای بیلد تمیز)..."
(cd "$PROJECT_ROOT/frontend" && rm -rf .next && npm run build)

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
