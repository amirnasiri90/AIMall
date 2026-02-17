# راهنمای استقرار AIMall روی سرور

این سند معماری استقرار، نصب اولیه و به‌روزرسانی را توضیح می‌دهد.

---

## معماری: یک سرور امروز، سه سرور در آینده

### وضعیت فعلی (شروع): همه روی یک سرور

```
┌─────────────────────────────────────────────────────────┐
│                    سرور واحد (VPS)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Frontend  │  │   Backend   │  │   PostgreSQL    │  │
│  │  (Next.js)  │  │  (NestJS)   │  │   (دیتابیس)     │  │
│  │   پورت 3000 │  │   پورت 3001 │  │   پورت 5432     │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │           │
│         └────────────────┴───────────────────┘           │
│                      Nginx (اختیاری)                      │
└─────────────────────────────────────────────────────────┘
```

- **دیتابیس:** روی همان سرور (PostgreSQL محلی) یا از اول با یک سرویس ابری (Neon, Supabase, RDS).
- **داده‌ها:** فقط داخل PostgreSQL و فایل‌های آپلود (در صورت وجود) هستند؛ هیچ دادهٔ حساس داخل کد یا build ذخیره نمی‌شود.

### وضعیت آینده: تفکیک سه سرور

وقتی بخواهید مقیاس بدهید، بدون از دست دادن داده می‌توانید به شکل زیر تفکیک کنید:

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  سرور فرانت‌اند   │   │  سرور بک‌اند      │   │  سرور دیتابیس   │
│  Next.js         │──▶│  NestJS          │──▶│  PostgreSQL      │
│  (یا CDN/Static) │   │  API             │   │  (یا سرویس ابری) │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

**کارهایی که لازم است فقط تنظیم شود (بدون پاک شدن داده):**

| مورد | امروز (یک سرور) | بعد از تفکیک |
|------|-------------------|---------------|
| **دیتابیس** | `DATABASE_URL=...@localhost:5432/aimall` | `DATABASE_URL=...@IP_سرور_دیتابیس:5432/aimall` |
| **فرانت‌اند** | `NEXT_PUBLIC_API_URL` خالی یا همان دامنه | `NEXT_PUBLIC_API_URL=https://api.domin.com/api/v1` |
| **بک‌اند** | `FRONTEND_URL=http://localhost:3000` | `FRONTEND_URL=https://domin.com` |

- داده‌ها فقط در **PostgreSQL** هستند؛ با تغییر `DATABASE_URL` به آدرس سرور جدید دیتابیس، همان داده‌ها استفاده می‌شوند.
- **هیچ دادهٔ داخل کد یا پوشهٔ پروژه** برای دیتابیس ذخیره نمی‌شود؛ پس جابه‌جایی سرورها اطلاعات را پاک نمی‌کند.

---

## پیش‌نیازهای سرور

- **سیستم‌عامل:** Ubuntu 22.04 LTS (یا Debian 12) توصیه می‌شود.
- **دسترسی:** کاربر با دسترسی `sudo`.
- **شبکه:** پورت‌های 80 و 443 برای وب؛ در حالت یک‌سرور، پورت‌های 3000 و 3001 فقط در صورت نیاز از بیرون باز باشند (ترجیحاً پشت Nginx).

---

## نصب اولیه (یک‌بار)

### ۱. کلون از GitHub

```bash
git clone https://github.com/YOUR_USERNAME/AIMall.git
cd AIMall
```

*(جای `YOUR_USERNAME` را با نام کاربری گیت‌هاب خود عوض کنید.)*

### ۲. اجرای نصب‌کننده

اسکریپت نصب زیر را **یک‌بار** روی سرور اجرا کنید. این اسکریپت:

- وابستگی‌های سیستمی (Node.js، PostgreSQL، Git و در صورت نیاز build tools) را نصب می‌کند
- وابستگی‌های Node (backend و frontend) را نصب می‌کند
- Prisma را generate و migrate می‌کند
- فرانت و بک‌اند را build می‌کند
- در صورت وجود، فایل‌های `.env` را از روی `.env.example` می‌سازد (اگر از قبل وجود نداشته باشند)
- با PM2 سرویس‌ها را اجرا و در صورت درخواست، آن‌ها را روی بالا آمدن سرور اجرا می‌کند

```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

در حین نصب، در صورت نیاز از شما مسیر پروژه، پورت‌ها و مسیر Node/PostgreSQL پرسیده می‌شود.

### ۳. تنظیم متغیرهای محیطی

قبل یا بعد از اولین اجرای `install.sh` حتماً فایل‌های env را ویرایش کنید:

- **Backend:** `backend/.env`  
  - حداقل: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`  
  - در صورت استفاده از پرداخت/سرویس‌های خارجی: زرین‌پال، OpenRouter، پیامک و غیره.

- **Frontend:** `frontend/.env.local`  
  - در حالت **یک سرور** و پشت Nginx با یک دامنه: می‌توانید `NEXT_PUBLIC_API_URL` را خالی بگذارید تا از همان دامنه و مسیر `/api/v1` استفاده شود.  
  - در حالت **تفکیک سرور** یا دسترسی مستقیم به API:  
    `NEXT_PUBLIC_API_URL=https://api.domin.com/api/v1`

جزئیات بیشتر هر متغیر در `backend/.env.example` و `frontend/.env.example` آمده است.

### ۴. (اختیاری) Nginx به‌عنوان پروکسی

اگر می‌خواهید فقط از طریق دامنه و پورت 80/443 دسترسی باشد، یک virtual host در Nginx تعریف کنید که:

- درخواست‌های `https://domin.com` را به فرانت (مثلاً `http://127.0.0.1:3000`) پروکسی کند.
- درخواست‌های `https://domin.com/api/v1` را به بک‌اند (مثلاً `http://127.0.0.1:3001`) پروکسی کند.

نمونهٔ حداقلی Nginx (یک سرور، یک دامنه):

```nginx
server {
  listen 80;
  server_name your-domain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
  }
  location /api/v1 {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

برای HTTPS و تنظیمات بیشتر: `docs/deploy-panel-aifoapp.md`.

---

## به‌روزرسانی (آپدیت) پروژه

برای هر بار آپدیت کد (بدون از دست دادن داده):

```bash
cd /path/to/AIMall
./scripts/update.sh
```

این اسکریپت معمولاً کارهای زیر را انجام می‌دهد:

- `git pull` برای دریافت آخرین تغییرات
- نصب وابستگی‌های جدید (`npm ci` در backend و frontend)
- اجرای مایگریشن دیتابیس (`prisma migrate deploy`)
- build دوبارهٔ backend و frontend
- ری‌استارت سرویس‌های PM2

با این روش هر بار آپدیت ارائه می‌کنید، فقط کافی است روی سرور `./scripts/update.sh` را اجرا کنید؛ داده‌های دیتابیس و تنظیمات `.env` دست‌نخورده می‌مانند.

---

## عیب‌یابی

### خطای `Cannot find module '.../dist/main'` یا `.../dist/main.js'`

یعنی پوشهٔ `dist` وجود ندارد یا خالی است (build روی سرور اجرا نشده یا با خطا روبه‌رو شده است).

**راه‌حل روی سرور:** حتماً داخل پوشهٔ بک‌اند build بگیرید و فقط در صورت موفق بودن خروجی، PM2 را ری‌استارت کنید:

```bash
cd ~/AIMall/backend
npm run build:prod
# اگر خطایی ندید و dist/main.js ساخته شد:
pm2 restart aimall-backend
```

اگر `npm run build:prod` خطا داد، همان خطا را برطرف کنید (مثلاً وابستگی‌ها با `npm ci`، یا مایگریشن با `npx prisma generate`).

---

### خطای `Cannot find module './dto/register.dto'` (بک‌اند استارت نمی‌شود)

اگر در لاگ PM2 (`pm2 logs aimall-backend`) این خطا را می‌بینید، معمولاً به‌خاطر build قدیمی یا ناقص است؛ پوشهٔ `dist` یا کامل ساخته نشده یا فایل‌های dto در آن نیستند.

**راه‌حل روی سرور:** یک بار build تمیز انجام دهید و بک‌اند را ری‌استارت کنید:

```bash
cd ~/AIMall/backend
npm run build:prod
pm2 restart aimall-backend
```

(اسکریپت `build:prod` اول پوشهٔ `dist` را پاک می‌کند و بعد دوباره build می‌گیرد.)

اگر اسکریپت `build:prod` نبود، دستی:

```bash
cd ~/AIMall/backend
rm -rf dist
npm run build
pm2 restart aimall-backend
```

بعد از آن `pm2 logs aimall-backend` را چک کنید؛ اگر خطای دیگری بود، همان را برطرف کنید.

---

### خطای 502 Bad Gateway روی `/api/v1/auth/login` (یا هر endpoint دیگر)

یعنی Nginx درخواست را به بک‌اند فرستاده ولی پاسخی نگرفته: یا بک‌اند خاموش/کرش است، یا روی پورت دیگری گوش می‌دهد.

**۱. وضعیت بک‌اند و پورت**

روی سرور اجرا کنید:

```bash
pm2 list
pm2 logs aimall-backend --lines 50
```

- اگر `aimall-backend` وضعیت **errored** یا مدام **restart** است، لاگ را بخوانید و خطا را برطرف کنید (مثلاً build تمیز و ری‌استارت).
- اگر **online** است، بررسی کنید بک‌اند روی چه پورتی گوش می‌دهد (معمولاً ۳۰۰۱):

```bash
grep -E '^PORT=' ~/AIMall/backend/.env
ss -tlnp | grep 3001
# یا
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/v1/health
```

اگر پورت در `.env` چیز دیگری است (مثلاً ۳۰۰۲)، باید در Nginx همان پورت را در `proxy_pass` استفاده کنید.

**۲. تنظیم Nginx**

فایل کانفیگ (مثلاً `/etc/nginx/sites-available/two-domains` یا همانی که برای `panel.aifoapp.ir` استفاده می‌کنید) باید چیزی شبیه این داشته باشد:

```nginx
location /api/v1 {
  proxy_pass http://127.0.0.1:3001;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

پورت `3001` باید با `PORT` در `backend/.env` یکی باشد. بعد از تغییر:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**۳. تست مستقیم بک‌اند**

اگر از روی خود سرور به بک‌اند درخواست بزنید و ۲۰۰ بگیرید، مشکل از Nginx یا شبکه است:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{}'
```

(۴۰۰ یا ۴۲۲ یعنی بک‌اند جواب داده؛ ۵۰۲ یا اتصال قطع یعنی بک‌اند جواب نمی‌دهد.)

---

## خلاصهٔ تفکیک آینده (سه سرور)

1. **سرور دیتابیس:** یک سرور فقط برای PostgreSQL (یا استفاده از سرویس ابری). همان دیتابیس و volume فعلی را نگه دارید؛ فقط در بقیهٔ سرورها `DATABASE_URL` را به آدرس این سرور/سرویس تغییر دهید.
2. **سرور بک‌اند:** فقط اجرای NestJS؛ `FRONTEND_URL` را به آدرس نهایی فرانت و در صورت نیاز CORS را برای دامنهٔ فرانت تنظیم کنید.
3. **سرور فرانت‌اند:** فقط اجرای Next.js؛ `NEXT_PUBLIC_API_URL` را به آدرس API بک‌اند (مثلاً `https://api.domin.com/api/v1`) بدهید.

با رعایت این موارد، **اطلاعات پاک نمی‌شوند** و فقط آدرس‌ها و envها عوض می‌شوند.
