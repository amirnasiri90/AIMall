# Nginx برای دو دامنه: panel.aifoapp.ir و ganoteb.health

قبل از اجرای این مراحل، کانتینر medical باید روی پورت **۸۰۸۰** باشد (نه ۸۰). در بخش «تغییر پورت کانتینر medical» زیر توضیح داده شده.

---

## ۱. تغییر پورت کانتینر medical

فرانت medical الان پورت ۸۰ را گرفته. باید فقط روی **۸۰۸۰** در دسترس باشد تا nginx روی ۸۰ بنشیند.

اگر با **docker-compose** اجرا می‌کنی، در پوشهٔ پروژهٔ medical در فایل `docker-compose.yml` (یا `docker-compose.prod.yml`) برای سرویس فرانت، پورت را عوض کن:

```yaml
# قبل
ports:
  - "80:80"

# بعد
ports:
  - "8080:80"
```

سپس:

```bash
cd /path/to/medical-ai-system
docker compose down
docker compose up -d
```

اگر با **docker run** اجرا کرده‌ای، کانتینر را با پورت جدید دوباره بساز (مثلاً `-p 8080:80`).

---

## ۲. یک فایل Nginx برای هر دو دامنه

روی سرور یک فایل واحد بساز که هر دو سایت را تعریف کند:

```bash
sudo nano /etc/nginx/sites-available/two-domains
```

محتوای زیر را بگذار (هر دو بلوک `server` را):

```nginx
# ─── AIMall: panel.aifoapp.ir ───
server {
    listen 80;
    server_name panel.aifoapp.ir;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

# ─── AIMall API (زیردامنه درگاه زرین‌پال): api.aifoapp.ir ───
# بعد از پرداخت، زرین‌پال به این آدرس ریدایرکت می‌کند؛ باید به همان بک‌اند (۳۰۰۱) برسد.
server {
    listen 80;
    server_name api.aifoapp.ir;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ─── Medical: ganoteb.health ───
server {
    listen 80;
    server_name ganoteb.health www.ganoteb.health;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

ذخیره و خروج.

---

## ۳. فعال‌کردن کانفیگ و خاموش کردن سایت‌های قبلی

```bash
# حذف لینک سایت‌های قبلی که روی 80 بودند
sudo rm -f /etc/nginx/sites-enabled/panel.aifoapp.ir
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/web

# لینک کردن فایل جدید
sudo ln -s /etc/nginx/sites-available/two-domains /etc/nginx/sites-enabled/

# تست و ری‌استارت
sudo nginx -t
sudo systemctl start nginx
sudo systemctl status nginx
```

اگر هنوز **پورت ۸۰ توسط Docker گرفته است**، اول کانتینر medical را با پورت ۸۰۸۰ بالا بیاور (مرحله ۱)، بعد این دستورات را بزن.

---

## ۴. SSL با Certbot (HTTPS)

بعد از اینکه هر دو دامنه با HTTP کار کردند:

```bash
sudo certbot --nginx -d panel.aifoapp.ir -d api.aifoapp.ir -d ganoteb.health -d www.ganoteb.health
```

یا جداگانه:

```bash
sudo certbot --nginx -d panel.aifoapp.ir
sudo certbot --nginx -d api.aifoapp.ir
sudo certbot --nginx -d ganoteb.health -d www.ganoteb.health
```

---

## ۴-۱. زیردامنهٔ درگاه (api.aifoapp.ir)

اگر در زرین‌پال زیردامنهٔ اختصاصی (مثلاً **api.aifoapp.ir**) تعریف کرده‌ای، بعد از پرداخت کاربر به آدرسی مثل  
`https://api.aifoapp.ir/api/v1/billing/payment/verify?Authority=...&Status=OK`  
هدایت می‌شود. این درخواست باید به همان بک‌اند (پورت ۳۰۰۱) برسد تا تأیید پرداخت انجام شود و سپس کاربر به پنل (`FRONTEND_URL`) ریدایرکت شود.

- در **کلودفلر**: رکورد A یا CNAME برای **api.aifoapp.ir** به IP سرور (همان panel).
- در **Nginx**: بلوک `server` برای **api.aifoapp.ir** (در همین فایل `two-domains`) که کل ترافیک را به `http://127.0.0.1:3001` پراکسی کند (محتوای بلوک در بخش ۲ بالا آمده).
- در **backend/.env** روی سرور:
  - `ZARINPAL_CALLBACK_URL=https://api.aifoapp.ir/api/v1/billing/payment/verify`
  - `FRONTEND_URL=https://panel.aifoapp.ir` (تا بعد از verify کاربر به صفحهٔ callback پنل برگردد).
- بعد از اضافه کردن بلوک، `sudo nginx -t && sudo systemctl reload nginx` و برای HTTPS:  
  `sudo certbot --nginx -d api.aifoapp.ir`

---

## خلاصهٔ ترتیب کار

1. پورت فرانت medical را به **۸۰۸۰** تغییر بده و کانتینر را دوباره بالا بیاور.
2. فایل `/etc/nginx/sites-available/two-domains` را با محتوای بالا بساز (شامل بلوک **api.aifoapp.ir** اگر از زیردامنهٔ درگاه استفاده می‌کنی).
3. لینک‌های قبلی را حذف و فقط `two-domains` را در `sites-enabled` فعال کن.
4. `nginx -t` و `systemctl start nginx` را اجرا کن.
5. در مرورگر تست کن: **http://panel.aifoapp.ir** و در صورت استفاده **http://api.aifoapp.ir** و **http://ganoteb.health**.
6. با `certbot --nginx` برای همهٔ دامنه‌ها (از جمله api.aifoapp.ir) گواهی HTTPS بگیر.
