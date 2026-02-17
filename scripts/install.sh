#!/usr/bin/env bash
# ===========================================
# AIMall — نصب‌کنندهٔ یک‌بار روی سرور
# استفاده: از ریشهٔ پروژه اجرا کنید: ./scripts/install.sh
# اختیاری: ./scripts/install.sh --with-deps  (نصب Node و PostgreSQL روی Ubuntu/Debian)
# ===========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()   { echo -e "${RED}[ERR]${NC} $1"; }

WITH_DEPS=false
for arg in "$@"; do
  [ "$arg" = "--with-deps" ] && WITH_DEPS=true
done

# --- ۱) نصب وابستگی‌های سیستمی (اختیاری) ---
if [ "$WITH_DEPS" = true ]; then
  if [ -f /etc/debian_version ]; then
    log_info "نصب وابستگی‌های سیستمی (Ubuntu/Debian)..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq curl git build-essential
    if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
      log_info "نصب Node.js 20 LTS..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y -qq nodejs
    fi
    if ! command -v psql &>/dev/null; then
      log_info "نصب PostgreSQL..."
      sudo apt-get install -y -qq postgresql postgresql-contrib
    fi
    if ! command -v pm2 &>/dev/null; then
      log_info "نصب PM2..."
      sudo npm install -g pm2
    fi
    log_info "وابستگی‌های سیستمی نصب شد."
  else
    log_warn "--with-deps فقط روی Debian/Ubuntu پشتیبانی می‌شود. Node 20+ و PostgreSQL و PM2 را خودتان نصب کنید."
  fi
fi

# --- ۲) بررسی پیش‌نیازها ---
command -v node &>/dev/null || { log_err "Node.js یافت نشد. نصب کنید یا اسکریپت را با --with-deps اجرا کنید."; exit 1; }
command -v npm &>/dev/null || { log_err "npm یافت نشد."; exit 1; }
NODE_VER=$(node -v | cut -d. -f1 | tr -d v)
[ "$NODE_VER" -ge 18 ] || { log_err "Node 18 یا بالاتر لازم است."; exit 1; }
[ -f "$PROJECT_ROOT/backend/package.json" ] || { log_err "پوشهٔ backend یافت نشد؛ از ریشهٔ پروژه اجرا کنید."; exit 1; }
[ -f "$PROJECT_ROOT/frontend/package.json" ] || { log_err "پوشهٔ frontend یافت نشد."; exit 1; }

# --- ۳) فایل‌های env ---
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
  if [ -f "$PROJECT_ROOT/backend/.env.example" ]; then
    cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
    log_info "فایل backend/.env از .env.example ساخته شد. آن را ویرایش کنید."
  else
    log_warn "backend/.env وجود ندارد؛ آن را دستی بسازید."
  fi
else
  log_info "backend/.env از قبل وجود دارد."
fi

if [ ! -f "$PROJECT_ROOT/frontend/.env.local" ]; then
  if [ -f "$PROJECT_ROOT/frontend/.env.example" ]; then
    cp "$PROJECT_ROOT/frontend/.env.example" "$PROJECT_ROOT/frontend/.env.local"
    log_info "فایل frontend/.env.local از .env.example ساخته شد. در صورت نیاز ویرایش کنید."
  fi
else
  log_info "frontend/.env.local از قبل وجود دارد."
fi

# --- ۴) وابستگی‌های Node ---
log_info "نصب وابستگی‌های Backend..."
(cd "$PROJECT_ROOT/backend" && npm ci --no-audit --no-fund)
log_info "نصب وابستگی‌های Frontend..."
(cd "$PROJECT_ROOT/frontend" && npm ci --no-audit --no-fund)

# --- ۵) Prisma ---
log_info "Prisma generate و migrate..."
(cd "$PROJECT_ROOT/backend" && npx prisma generate)
(cd "$PROJECT_ROOT/backend" && npx prisma migrate deploy) || log_warn "migrate deploy خطا داد؛ احتمالاً DATABASE_URL اشتباه است یا دیتابیس آماده نیست."

# --- ۶) Seed (اختیاری؛ فقط اگر جدول‌ها خالی باشند) ---
# (cd "$PROJECT_ROOT/backend" && npx prisma db seed) || true

# --- ۷) Build ---
log_info "Build Backend..."
(cd "$PROJECT_ROOT/backend" && npm run build)
log_info "Build Frontend..."
(cd "$PROJECT_ROOT/frontend" && npm run build)

# --- ۸) PM2 ---
if command -v pm2 &>/dev/null; then
  log_info "راه‌اندازی با PM2..."
  pm2 delete aimall-backend 2>/dev/null || true
  pm2 delete aimall-frontend 2>/dev/null || true
  pm2 start npm --name aimall-backend --cwd "$PROJECT_ROOT/backend" -- run start:prod
  pm2 start npm --name aimall-frontend --cwd "$PROJECT_ROOT/frontend" -- run start
  pm2 save
  pm2 startup 2>/dev/null || log_info "برای اجرای خودکار بعد از ری‌استارت سرور: pm2 startup"
  log_info "سرویس‌ها با PM2 اجرا شدند: pm2 status"
else
  log_warn "PM2 نصب نیست. برای اجرا: cd backend && npm run start:prod و cd frontend && npm run start"
fi

log_info "نصب تمام شد. Backend معمولاً روی پورت 3001 و Frontend روی 3000 در دسترس است."
