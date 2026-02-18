#!/usr/bin/env bash
# ===========================================
# AIMall — بررسی وضعیت آپدیت و سرورها
# استفاده: ./scripts/check-update.sh
# ===========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERR]${NC} $1"; }
log_ok() { echo -e "${BLUE}[OK]${NC} $1"; }

echo ""
echo "=========================================="
echo "  بررسی وضعیت آپدیت و سرورها"
echo "=========================================="
echo ""

# 1. بررسی Git
if [ -d .git ]; then
  log_info "بررسی Git..."
  CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
  log_ok "Commit فعلی: $CURRENT_COMMIT (branch: $CURRENT_BRANCH)"
  
  # بررسی تغییرات جدید
  git fetch --quiet 2>/dev/null || true
  LOCAL=$(git rev-parse @ 2>/dev/null || echo "")
  REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
  if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    log_warn "تغییرات جدید در remote وجود دارد. برای آپدیت: ./scripts/update.sh"
  else
    log_ok "کد به‌روز است"
  fi
else
  log_warn "پوشهٔ .git یافت نشد"
fi

echo ""

# 2. بررسی Release ID
if [ -f "$PROJECT_ROOT/frontend/public/release.json" ]; then
  log_info "Release ID فعلی:"
  cat "$PROJECT_ROOT/frontend/public/release.json" | grep -o '"releaseId":"[^"]*"' | cut -d'"' -f4 || echo "unknown"
else
  log_warn "فایل release.json یافت نشد"
fi

echo ""

# 3. بررسی PM2
if command -v pm2 &>/dev/null; then
  log_info "وضعیت PM2:"
  pm2 status | grep -E "(aimall|status)" || log_warn "سرویس‌های aimall در PM2 یافت نشدند"
  
  echo ""
  log_info "بررسی سلامت سرویس‌ها:"
  
  # Backend
  if pm2 describe aimall-backend &>/dev/null; then
    BACKEND_STATUS=$(pm2 jlist | grep -A 10 '"name":"aimall-backend"' | grep -o '"pm2_env":{"status":"[^"]*"' | cut -d'"' -f6 || echo "unknown")
    if [ "$BACKEND_STATUS" = "online" ]; then
      log_ok "Backend: در حال اجرا"
    else
      log_err "Backend: $BACKEND_STATUS"
    fi
  else
    log_err "Backend: در PM2 یافت نشد"
  fi
  
  # Frontend
  if pm2 describe aimall-frontend &>/dev/null; then
    FRONTEND_STATUS=$(pm2 jlist | grep -A 10 '"name":"aimall-frontend"' | grep -o '"pm2_env":{"status":"[^"]*"' | cut -d'"' -f6 || echo "unknown")
    if [ "$FRONTEND_STATUS" = "online" ]; then
      log_ok "Frontend: در حال اجرا"
    else
      log_err "Frontend: $FRONTEND_STATUS"
    fi
  else
    log_err "Frontend: در PM2 یافت نشد"
  fi
else
  log_warn "PM2 نصب نیست. بررسی دستی سرویس‌ها..."
fi

echo ""

# 4. بررسی پورت‌ها
log_info "بررسی پورت‌ها:"
if command -v lsof &>/dev/null; then
  if lsof -ti:3001 &>/dev/null; then
    log_ok "پورت 3001 (Backend): فعال"
  else
    log_err "پورت 3001 (Backend): غیرفعال"
  fi
  
  if lsof -ti:3000 &>/dev/null; then
    log_ok "پورت 3000 (Frontend): فعال"
  else
    log_err "پورت 3000 (Frontend): غیرفعال"
  fi
else
  log_warn "lsof در دسترس نیست"
fi

echo ""

# 5. بررسی Health Endpoints
log_info "بررسی Health Endpoints:"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

if curl -s -f "$BACKEND_URL/api/v1/health" &>/dev/null; then
  log_ok "Backend Health: OK"
else
  log_err "Backend Health: FAILED"
fi

if curl -s -f "$FRONTEND_URL" &>/dev/null; then
  log_ok "Frontend: در دسترس"
else
  log_err "Frontend: در دسترس نیست"
fi

echo ""
echo "=========================================="
log_info "بررسی تمام شد"
echo "=========================================="
echo ""

