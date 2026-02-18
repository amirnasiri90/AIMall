# راهنمای آپدیت و بررسی سرور

## دستورات آپدیت

### 1. آپدیت پروژه روی سرور

```bash
cd /path/to/AIMall
./scripts/update.sh
```

این دستور:
- آخرین تغییرات را از Git می‌گیرد
- وابستگی‌های Backend و Frontend را نصب می‌کند
- Prisma migrations را اجرا می‌کند
- Backend و Frontend را build می‌کند
- سرویس‌های PM2 را restart می‌کند
- Release ID را به‌روز می‌کند

**نکته:** داده‌های دیتابیس و تنظیمات `.env` دست‌نخورده می‌مانند.

---

### 2. بررسی وضعیت آپدیت و سرورها

```bash
cd /path/to/AIMall
./scripts/check-update.sh
```

این دستور بررسی می‌کند:
- ✅ وضعیت Git (commit فعلی و تغییرات جدید)
- ✅ Release ID فعلی
- ✅ وضعیت سرویس‌های PM2 (Backend و Frontend)
- ✅ پورت‌های 3000 و 3001
- ✅ Health endpoints (Backend و Frontend)

---

## دستورات دستی

### بررسی وضعیت PM2

```bash
pm2 status
pm2 logs aimall-backend
pm2 logs aimall-frontend
```

### Restart دستی

```bash
pm2 restart aimall-backend
pm2 restart aimall-frontend
# یا
pm2 restart all
```

### بررسی Release ID در Frontend

```bash
cat frontend/public/release.json
```

یا در مرورگر:
```
http://your-domain/api/release
```

### بررسی Health Endpoints

```bash
# Backend
curl http://localhost:3001/api/v1/health

# Frontend
curl http://localhost:3000
```

---

## عیب‌یابی

### اگر آپدیت موفق نبود:

1. **بررسی لاگ‌ها:**
   ```bash
   pm2 logs aimall-backend --lines 50
   pm2 logs aimall-frontend --lines 50
   ```

2. **بررسی Build:**
   ```bash
   cd backend && npm run build
   cd frontend && npm run build
   ```

3. **بررسی Migrations:**
   ```bash
   cd backend && npx prisma migrate status
   ```

4. **Restart کامل:**
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.cjs
   ```

---

## نکات مهم

- ⚠️ قبل از آپدیت، از دیتابیس backup بگیرید
- ⚠️ در production، آپدیت را در ساعات کم‌ترافیک انجام دهید
- ✅ بعد از آپدیت، حتماً `check-update.sh` را اجرا کنید
- ✅ اگر از Cloudflare استفاده می‌کنید، بعد از آپدیت Cache را Purge کنید

