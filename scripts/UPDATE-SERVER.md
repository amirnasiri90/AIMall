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

