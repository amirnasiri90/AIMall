#!/usr/bin/env bash
# ===========================================
# AIMall — رفع مشکل اتصال دیتابیس
# استفاده: ./scripts/fix-database-connection.sh
# ===========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERR]${NC} $1"; }

log_info "بررسی وضعیت PostgreSQL..."

# بررسی سرویس PostgreSQL
if systemctl is-active --quiet postgresql || systemctl is-active --quiet postgresql@*; then
  log_info "PostgreSQL در حال اجرا است"
else
  log_warn "PostgreSQL در حال اجرا نیست. در حال راه‌اندازی..."
  sudo systemctl start postgresql || sudo systemctl start postgresql@* || log_err "نمی‌توان PostgreSQL را راه‌اندازی کرد"
fi

# بررسی اتصال
log_info "بررسی اتصال به دیتابیس..."
cd "$PROJECT_ROOT/backend"

if [ -f .env ]; then
  DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  if [ -z "$DATABASE_URL" ]; then
    log_err "DATABASE_URL در .env یافت نشد"
    exit 1
  fi
    
  # استخراج اطلاعات از DATABASE_URL
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  log_info "اطلاعات دیتابیس:"
  echo "  User: $DB_USER"
  echo "  Host: $DB_HOST"
  echo "  Port: ${DB_PORT:-5432}"
  echo "  Database: $DB_NAME"
  
  # تست اتصال
  if command -v psql &>/dev/null; then
    log_info "تست اتصال با psql..."
    if PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
      log_info "✅ اتصال به دیتابیس موفق بود"
    else
      log_err "❌ اتصال به دیتابیس ناموفق"
      log_warn "بررسی کنید:"
      echo "  1. PostgreSQL در حال اجرا است؟"
      echo "  2. DATABASE_URL در .env درست است؟"
      echo "  3. کاربر دیتابیس دسترسی دارد؟"
    fi
  fi
else
  log_err "فایل .env یافت نشد"
  exit 1
fi

# Prisma generate
log_info "Prisma generate..."
npx prisma generate

# بررسی migrations
log_info "بررسی migrations..."
npx prisma migrate status || log_warn "خطا در بررسی migrations"

log_info "اگر مشکل ادامه داشت:"
echo "  1. Backend را restart کنید: pm2 restart aimall-backend"
echo "  2. لاگ‌ها را بررسی کنید: pm2 logs aimall-backend --lines 50"
echo "  3. اتصال دیتابیس را تست کنید: psql \$DATABASE_URL"

