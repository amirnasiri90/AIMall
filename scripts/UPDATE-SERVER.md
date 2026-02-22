# دستورات آپدیت روی سرور

## آپدیت سریع

```bash
cd ~/AIMall
./scripts/update.sh
```

## بررسی قبل از آپدیت

```bash
cd ~/AIMall
./scripts/check-update.sh
```

## آپدیت دستی (گام به گام)

### 1. دریافت آخرین تغییرات از GitHub

```bash
cd ~/AIMall
git pull
```

### 2. بررسی تغییرات

```bash
git log --oneline -5
```

باید commit جدید `aef75a9` را ببینید.

### 3. نصب وابستگی‌ها

```bash
cd ~/AIMall/backend
npm ci --no-audit --no-fund

cd ~/AIMall/frontend
npm ci --no-audit --no-fund
```

### 4. Prisma

```bash
cd ~/AIMall/backend
npx prisma generate
npx prisma migrate deploy
```

### 5. Build

```bash
# Backend
cd ~/AIMall/backend
npm run build:prod

# Frontend
cd ~/AIMall/frontend
rm -rf .next
npm run build
```

### 6. به‌روزرسانی Release ID

```bash
cd ~/AIMall
RELEASE_ID=$(git rev-parse --short HEAD)
echo "{\"releaseId\":\"$RELEASE_ID\"}" > frontend/public/release.json
cat frontend/public/release.json
```

باید `aef75a9` را ببینید.

### 7. Restart PM2

```bash
cd ~/AIMall
pm2 restart all
# یا
pm2 delete aimall-backend aimall-frontend
pm2 start ecosystem.config.cjs
pm2 save
```

### 8. بررسی نهایی

```bash
# بررسی Release ID
cat ~/AIMall/frontend/public/release.json

# بررسی PM2
pm2 status

# بررسی Health
curl http://localhost:3001/api/v1/health
```

## عیب‌یابی

### اگر npm ci با «Killed» تمام شد (کمبود RAM)

روی سرورهای کم‌حافظه (مثلاً ۱GB) ممکن است `npm ci` توسط سیستم با **Killed** قطع شود. اسکریپت `update.sh` در این حالت خودش با `npm install` دوباره تلاش می‌کند. اگر باز هم خطا دیدید:

1. **اضافه کردن Swap (پیشنهادی)**  
   برای کاهش احتمال OOM این دستورات را یک‌بار اجرا کنید:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
   بعد از آن دوباره `./scripts/update.sh` را اجرا کنید.

2. **آپدیت دستی با npm install**  
   به‌جای `npm ci` از `npm install` استفاده کنید:
   ```bash
   cd ~/AIMall/backend
   npm install --no-audit --no-fund
   cd ~/AIMall/frontend
   npm install --no-audit --no-fund
   ```
   سپس بقیهٔ مراحل (Prisma، Build، PM2) را مثل آپدیت دستی انجام دهید.

### اگر git pull خطا داد:

```bash
cd ~/AIMall
git fetch
git status
# اگر conflict دارید:
git stash
git pull
git stash pop
```

### اگر build خطا داد:

```bash
# پاک‌سازی و rebuild
cd ~/AIMall/backend
rm -rf dist node_modules
npm install
npm run build

cd ~/AIMall/frontend
rm -rf .next node_modules
npm install
npm run build
```

### اگر PM2 restart نشد:

```bash
pm2 logs aimall-backend --lines 50
pm2 logs aimall-frontend --lines 50
pm2 restart all
```

## پس از آپدیت سرور — تنظیمات لازم

برای اینکه همه‌چیز درست کار کند (لوگو با HTTPS، تصاویر ویرایش بدون 403، بدون Mixed Content):

1. **متغیر محیطی بک‌اند**  
   در `.env` بک‌اند روی سرور مقدار زیر را با دامنهٔ واقعی پنل تنظیم کنید:
   ```bash
   BACKEND_PUBLIC_URL=https://panel.aifoapp.ir
   ```
   (اگر پنل روی دامنهٔ دیگری است، همان را بگذارید.)

2. **Nginx**  
   برای پروکسی به بک‌اند این دو هدر را حتماً بفرستید:
   ```nginx
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-Host $host;
   ```
   اگر پشت SSL هستید و `$scheme` برابر `http` است، می‌توانید به‌جای آن بنویسید:
   ```nginx
   proxy_set_header X-Forwarded-Proto https;
   ```

3. **ری‌استارت سرویس‌ها**  
   بعد از تغییر `.env` یا Nginx:
   ```bash
   pm2 restart all
   sudo systemctl reload nginx   # در صورت استفاده از Nginx
   ```

4. **کش Cloudflare (در صورت استفاده)**  
   بعد از آپدیت یک بار Cache را Purge کنید تا نسخهٔ جدید فرانت و لوگو لود شود.

