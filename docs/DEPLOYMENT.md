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
cd ~/AIMall
# یا اگر پروژه جای دیگری است: cd /root/AIMall یا cd /var/www/AIMall
git pull origin main
chmod +x scripts/update.sh
./scripts/update.sh
```

*(مسیر را با مسیر واقعی پروژه روی سرور عوض کن. `~/AIMall` یعنی پوشهٔ AIMall داخل home کاربر.)*

این اسکریپت معمولاً کارهای زیر را انجام می‌دهد:

- `git pull` برای دریافت آخرین تغییرات
- نصب وابستگی‌های جدید (`npm ci` در backend و frontend)
- اجرای مایگریشن دیتابیس (`prisma migrate deploy`)
- build دوبارهٔ backend و frontend
- ری‌استارت سرویس‌های PM2

با این روش هر بار آپدیت ارائه می‌کنید، فقط کافی است روی سرور `./scripts/update.sh` را اجرا کنید؛ داده‌های دیتابیس و تنظیمات `.env` دست‌نخورده می‌مانند.

---

## عیب‌یابی

### سایت اصلاً بالا نمی‌آید (صفحه سفید، ۵۰۲، یا اتصال قطع)

روی سرور این اسکریپت را اجرا کن تا وضعیت سرویس‌ها و پورت‌ها را ببینی:

```bash
cd ~/AIMall
chmod +x scripts/check-server.sh
./scripts/check-server.sh
```

خروجی به تو می‌گوید کدام بخش [OK] و کدام [FAIL] است.

| اگر [FAIL] بود برای | کار انجام بده |
|----------------------|----------------|
| **aimall-backend آنلاین نیست** | `cd ~/AIMall/backend && npm run build:prod && cd ~/AIMall && pm2 start ecosystem.config.cjs --only aimall-backend && pm2 save` |
| **aimall-frontend آنلاین نیست** | `cd ~/AIMall/frontend && rm -rf .next && npm run build && cd ~/AIMall && pm2 start ecosystem.config.cjs --only aimall-frontend && pm2 save` |
| **پورت 3000/3001 گوش نمی‌دهد** | همان بالا؛ بعد از build و start، دوباره `./scripts/check-server.sh` بزن |
| **فرانت جواب نداد** | فرانت را build کن و با PM2 استارت کن (بالا). لاگ: `pm2 logs aimall-frontend` |
| **بک‌اند جواب نداد** | بک‌اند را build:prod و استارت کن. لاگ: `pm2 logs aimall-backend` |
| **backend/dist/main.js وجود ندارد** | `cd ~/AIMall/backend && npm run build:prod` |
| **frontend/.next وجود ندارد** | `cd ~/AIMall/frontend && npm run build` |
| **nginx -t خطا داد** | فایل کانفیگ Nginx را اصلاح کن؛ معمولاً در `/etc/nginx/sites-available/` |

### بعد آپدیت هیچ چیزی عوض نشد (همان نسخهٔ قبلی دیده می‌شود)

۱. **کش مرورگر:** مرورگر ممکن است JS/CSS قدیمی را نگه داشته باشد.
   - **Hard Refresh:** `Ctrl+Shift+R` (ویندوز/لینوکس) یا `Cmd+Shift+R` (مک).
   - یا یک تب **ناشناس/خصوصی** باز کن و دوباره وارد پنل شو.
   - یا از تنظیمات مرورگر «پاک کردن کش» برای این سایت را بزن.

۲. **کش Nginx:** اگر برای دامنه کش پروکسی گذاشتی، کش را خالی کن:
   ```bash
   sudo nginx -s reload
   ```
   یا در کانفیگ Nginx برای این سرور `proxy_cache` را موقتاً غیرفعال کن و بعد `reload` بزن.

۳. **بیلد تمیز فرانت:** اسکریپت آپدیت از این به بعد قبل از بیلد فرانت پوشهٔ `.next` را پاک می‌کند. اگر با اسکریپت قدیمی آپدیت کرده بودی، یک بار دستی این کار را بکن و دوباره بیلد و ری‌استارت کن:
   ```bash
   cd /path/to/AIMall/frontend
   rm -rf .next
   npm run build
   cd /path/to/AIMall
   pm2 restart aimall-frontend
   pm2 save
   ```

۴. **بررسی اینکه آپدیت واقعاً اعمال شده:** روی سرور چک کن:
   ```bash
   cd /path/to/AIMall
   git log -1 --oneline
   cat frontend/public/release.json
   ```
   باید آخرین کامیت و یک `releaseId` (مثلاً هش گیت) را ببینی. بعد در مرورگر آدرس `https://دامنه-تو/release.json` را باز کن؛ باید همان `releaseId` را ببینی (اگر نه، یا Nginx کش می‌کند یا به سرور اشتباه می‌روی).

۵. **کش Cloudflare (مهم):** اگر دامنه پشت Cloudflare است، کش ابری Cloudflare ممکن است نسخهٔ قدیمی را روزها نگه دارد. حتماً بعد از هر آپدیت:
   - وارد **داشبورد Cloudflare** شو → دامنهٔ پنل (مثلاً panel.aifoapp.ir) را انتخاب کن.
   - برو **Caching** → **Configuration** → **Purge Everything** (پاک کردن کل کش).
   بعد در مرورگر یک بار Hard Refresh بزن.

۶. **PM2 از مسیر اشتباه اجرا شده:** اسکریپت آپدیت الان قبل از ری‌استارت، PM2 را با `ecosystem.config.cjs` (مسیر مطلق) دوباره استارت می‌کند تا حتماً از همان پوشهٔ آپدیت‌شده سِرو شود. اگر قبلاً با روش دیگری (مثلاً فقط `pm2 restart`) آپدیت می‌کردی، از این به بعد با همان `./scripts/update.sh` آپدیت کن.

---

اگر همه [OK] بود ولی از بیرون (با دامنه) سایت باز نمی‌شود:

- **فایروال:** `sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw status`
- **Nginx:** `sudo systemctl status nginx` و `sudo nginx -t && sudo systemctl reload nginx`
- **DNS/Cloudflare:** رکورد A دامنه به IP سرور اشاره کند و پروکسی (نارنجی) درست باشد. رفع ریدایرکت و SSL در `docs/troubleshoot-domain-cloudflare.md`.

---

### خطای `Cannot find module '.../dist/main'` یا `.../dist/main.js'`

دو احتمال دارد: (۱) پوشهٔ `dist` ساخته نشده یا خالی است، (۲) PM2 از مسیر (cwd) اشتباه اجرا می‌شود و فایل را پیدا نمی‌کند.

**گام ۱ – بررسی روی سرور:** ببینید فایل واقعاً ساخته شده یا نه:

```bash
ls -la /root/AIMall/backend/dist/
```

اگر `main.js` نبود، از داخل پوشهٔ بک‌اند دوباره build بگیرید (اگر build خطا ندهد، اسکریپت خودش وجود `dist/main.js` را چک می‌کند):

```bash
cd /root/AIMall/backend
rm -rf dist
npm run build
ls -la dist/main.js
```

اگر اینجا `main.js` دیده شد ولی PM2 هنوز خطا می‌دهد، یعنی **PM2 با مسیر کاری (cwd) اشتباه بالا آمده**. در آن صورت از گام ۲ استفاده کنید.

**گام ۲ – بالا آوردن PM2 با مسیر درست (پیشنهادی):** از ریشهٔ پروژه با فایل `ecosystem.config.cjs` اجرا کنید تا cwd برای بک‌اند حتماً همان پوشهٔ backend باشد:

```bash
cd /root/AIMall
pm2 delete aimall-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs --only aimall-backend
pm2 save
```

اگر فرانت را هم با همین فایل می‌خواهید مدیریت کنید:

```bash
cd /root/AIMall
pm2 delete aimall-backend aimall-frontend 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
```

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

### خطای `Failed to find Server Action "x". This request might be from an older or newer deployment` (فرانت‌اند)

یعنی مرورگر با یک **build قدیمی** (کش شده) با سرور که **build جدید** دارد صحبت می‌کند؛ شناسهٔ Server Actionها عوض شده و دیگر تطابق ندارند.

**روی سرور – build تمیز فرانت و ری‌استارت:**

```bash
cd ~/AIMall/frontend
rm -rf .next
npm run build
cd ~/AIMall
pm2 restart aimall-frontend
pm2 save
```

**برای کاربران (مرورگر):**

- یک بار **Hard Refresh:** `Ctrl+Shift+R` (ویندوز/لینوکس) یا `Cmd+Shift+R` (مک).
- یا در DevTools → Application → Storage → **Clear site data** برای همین دامنه، بعد رفرش و دوباره لاگین.

بعد از build تمیز و ری‌استارت فرانت، اگر کاربر هنوز خطا دید، حتماً Hard Refresh یا پاک کردن کش/دادهٔ سایت را انجام دهد.

---

## خلاصهٔ تفکیک آینده (سه سرور)

1. **سرور دیتابیس:** یک سرور فقط برای PostgreSQL (یا استفاده از سرویس ابری). همان دیتابیس و volume فعلی را نگه دارید؛ فقط در بقیهٔ سرورها `DATABASE_URL` را به آدرس این سرور/سرویس تغییر دهید.
2. **سرور بک‌اند:** فقط اجرای NestJS؛ `FRONTEND_URL` را به آدرس نهایی فرانت و در صورت نیاز CORS را برای دامنهٔ فرانت تنظیم کنید.
3. **سرور فرانت‌اند:** فقط اجرای Next.js؛ `NEXT_PUBLIC_API_URL` را به آدرس API بک‌اند (مثلاً `https://api.domin.com/api/v1`) بدهید.

با رعایت این موارد، **اطلاعات پاک نمی‌شوند** و فقط آدرس‌ها و envها عوض می‌شوند.
