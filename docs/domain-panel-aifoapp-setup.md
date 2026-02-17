# اتصال دامنه panel.aifoapp.ir به سرور

راهنمای گام‌به‌گام برای در دسترس قرار دادن پنل روی **https://panel.aifoapp.ir**.

---

## ۱. DNS (رکورد دامنه)

در پنل مدیریت دامنه (همان جایی که aifoapp.ir را مدیریت می‌کنید):

- یک **رکورد A** یا **CNAME** برای زیردامنهٔ `panel` اضافه کنید:
  - **نام/Host:** `panel` (یا `panel.aifoapp.ir` بسته به پنل)
  - **مقدار/Value:** **IP سرور** شما (مثلاً همان IP که الان با SSH وصل می‌شوید)
  - **TTL:** ۳۰۰ یا پیش‌فرض

بعد از ذخیره، چند دقیقه تا چند ساعت صبر کنید تا DNS به‌روز شود. با `ping panel.aifoapp.ir` می‌توانید چک کنید که به IP سرور اشاره می‌کند.

---

## ۲. نصب Nginx و Certbot (روی سرور)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## ۳. فایل تنظیمات Nginx برای panel.aifoapp.ir

یک فایل سایت بسازید:

```bash
sudo nano /etc/nginx/sites-available/panel.aifoapp.ir
```

این محتوا را داخلش بگذارید (فعلاً فقط HTTP روی پورت ۸۰؛ بعداً با certbot خودش HTTPS را اضافه می‌کند):

```nginx
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
```

ذخیره و خروج (`Ctrl+O`, `Enter`, `Ctrl+X`).

فعال کردن سایت و تست و ری‌لود Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/panel.aifoapp.ir /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ۴. گواهی SSL (HTTPS) با Let's Encrypt

```bash
sudo certbot --nginx -d panel.aifoapp.ir
```

- ایمیل را وارد کنید.
- با قوانین موافقت کنید.
- در صورت تمایل ایمیل اطلاع‌رسانی را خالی بگذارید.
- Certbot به‌طور خودکار تنظیمات Nginx را برای HTTPS و ریدایرکت 80→443 انجام می‌دهد.

تجدید خودکار گواهی (اختیاری):

```bash
sudo certbot renew --dry-run
```

---

## ۵. تنظیمات env روی سرور

### بک‌اند — `~/AIMall/backend/.env`

مطمئن شوید این مقادیر را دارید:

```env
FRONTEND_URL=https://panel.aifoapp.ir
PORT=3001
```

اگر زرین‌پال استفاده می‌کنید:

```env
ZARINPAL_CALLBACK_URL=https://panel.aifoapp.ir/api/v1/billing/payment/verify
```

### فرانت — `~/AIMall/frontend/.env.local`

در این سناریو (همه‌چیز پشت یک دامنه) می‌توانید خالی بگذارید یا نگذارید تا درخواست‌ها به `/api/v1` (همان دامنه) بروند:

```env
# خالی یا حذف کنید
# NEXT_PUBLIC_API_URL=
```

اگر فایل را عوض کردید، فرانت را دوباره build و ری‌استارت کنید:

```bash
cd ~/AIMall/frontend
npm run build
pm2 restart aimall-frontend
```

بک‌اند را هم ری‌استارت کنید:

```bash
pm2 restart aimall-backend
```

---

## ۶. تست

- در مرورگر باز کنید: **https://panel.aifoapp.ir**
- باید صفحهٔ لاگین/پنل را ببینید و درخواست‌های API بدون خطای CORS کار کنند.

اگر خطا دیدید، لاگ Nginx و PM2 را چک کنید:

```bash
sudo tail -50 /var/log/nginx/error.log
pm2 logs aimall-backend --lines 30
pm2 logs aimall-frontend --lines 30
```
