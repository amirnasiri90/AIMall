# عیب‌یابی: سایت با panel.aifoapp.ir باز نمی‌شود (Cloudflare)

---

## ۱. روی سرور: پورت‌های ۸۰ و ۴۴۳ باز باشند

اگر فایروال دارید، باید پورت ۸۰ (و در صورت استفاده از HTTPS، ۴۴۳) باز باشد:

```bash
# اگر از ufw استفاده می‌کنید:
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status
sudo ufw enable   # اگر هنوز فعال نشده
```

---

## ۲. روی سرور: Nginx در حال اجرا و درست تنظیم شده باشد

```bash
sudo systemctl status nginx
```

اگر فعال نبود:

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

تست تنظیمات و لیست سایت‌ها:

```bash
sudo nginx -t
ls -la /etc/nginx/sites-enabled/
```

باید فایلی برای `panel.aifoapp.ir` (یا همان دامنه) وجود داشته باشد. اگر نیست، طبق **docs/domain-panel-aifoapp-setup.md** دوباره سایت را اضافه و لینک کنید.

---

## ۳. روی سرور: گوش دادن به پورت ۸۰ و ۴۴۳

```bash
sudo ss -tlnp | grep -E ':80|:443'
```

باید خروجی شبیه این ببینید (nginx روی 80 و در صورت استفاده از SSL روی 443):

```
LISTEN  ...  *:80   ... nginx
LISTEN  ...  *:443  ... nginx
```

اگر 80/443 در لیست نیست، یا Nginx اجرا نشده یا سایت برای این پورت‌ها تعریف نشده.

---

## ۴. تست مستقیم با IP سرور (بدون دامنه)

از **همان سرور** یا از کامپیوتر خودتان:

```bash
curl -I http://IP_سرور
```

مثال (به‌جای ۱.۲.۳.۴ IP واقعی سرور را بگذارید):

```bash
curl -I http://1.2.3.4
```

اگر پاسخ **200** یا **302** گرفتید، یعنی Nginx و اپ روی سرور جواب می‌دهند و مشکل احتمالاً از DNS یا Cloudflare است.

اگر **اتصال قطع شد (Connection refused)** یعنی یا Nginx نیست یا فایروال پورت 80 را بسته.

---

## ۵. Cloudflare: رکورد A و حالت پروکسی

در پنل Cloudflare برای دامنهٔ aifoapp.ir:

- برو **DNS** → **Records**.
- یک رکورد **A** باید باشد:
  - **Name:** `panel` (تا آدرس شود panel.aifoapp.ir)
  - **IPv4 address:** همان **IP سرور** شما
  - **Proxy status:**
    - **Proxied (نارنجی):** ترافیک از Cloudflare رد می‌شود (مزیت کش و امنیت).
    - **DNS only (خاکستری):** فقط DNS؛ ترافیک مستقیم به سرور می‌رود (برای تست ساده‌تر است).

برای تست اول می‌توانی موقتاً **DNS only** کنی و دوباره سایت را با https://panel.aifoapp.ir امتحان کنی.

---

## ۶. Cloudflare: حالت SSL/TLS

برو **SSL/TLS** → **Overview**:

- **Flexible:** کاربر با Cloudflare با HTTPS صحبت می‌کند؛ Cloudflare با سرور شما با **HTTP** صحبت می‌کند. اگر روی سرور هنوز گواهی HTTPS نصب نکرده‌اید، این حالت را انتخاب کنید تا سایت حداقل باز شود.
- **Full** یا **Full (strict):** Cloudflare با سرور شما با **HTTPS** صحبت می‌کند. در این حالت حتماً روی سرور باید گواهی معتبر (مثلاً با `certbot`) برای panel.aifoapp.ir نصب شده باشد.

اگر هنوز روی سرور `certbot` اجرا نکرده‌اید، حالت را روی **Flexible** بگذارید؛ بعد از نصب گواهی روی سرور می‌توانی به **Full** یا **Full (strict)** تغییر بدهی.

---

## ۶.۱. ERR_TOO_MANY_REDIRECTS با Full (strict)

اگر SSL را روی **Full (strict)** گذاشتی و سایت با خطای **ERR_TOO_MANY_REDIRECTS** یا **net::ERR_TOO_MANY_REDIRECTS** در کنسول باز نمی‌شود، معمولاً یکی از این موارد است:

### الف) ریدایرکت در Nginx یا اپلیکیشن

- اپلیکیشن (مثلاً Next.js) با هدر **X-Forwarded-Proto** تشخیص می‌دهد درخواست HTTP است یا HTTPS. اگر این هدر به‌درستی **https** نباشد، اپ فکر می‌کند درخواست HTTP است و به HTTPS ریدایرکت می‌کند و حلقه ایجاد می‌شود.
- روی سرور در بلوک **۴۴۳** (HTTPS) برای `panel.aifoapp.ir` حتماً این هدر را **صریح** بگذار (در همان فایل Nginx مثلاً `two-domains`):

```nginx
proxy_set_header X-Forwarded-Proto https;
```

یعنی در بلوک `server` که `listen 443 ssl` دارد، داخل هر دو `location /` و `location /api/v1` به‌جای:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

از این استفاده کن:

```nginx
proxy_set_header X-Forwarded-Proto https;
```

سپس `sudo nginx -t` و `sudo systemctl reload nginx`.

### ب) ریدایرکت در جای دیگر Nginx

- ممکن است یک **default server** یا سایت دیگر برای پورت ۴۴۳ ریدایرکت ۳۰۱ به HTTPS بگذارد و درخواست‌های panel به آن بلوک برسد.
- روی سرور بررسی کن که برای `panel.aifoapp.ir` **هیچ** بلوکی `return 301 https://...` یا مشابه نداشته باشد (مخصوصاً روی پورت ۸۰ برای همین سرورنیم).
- همهٔ فایل‌های داخل `sites-enabled` را چک کن:

```bash
sudo grep -r "return 301" /etc/nginx/sites-enabled/
sudo grep -r "return 302" /etc/nginx/sites-enabled/
```

اگر برای `panel.aifoapp.ir` یا یک default برای ۴۴۳ ریدایرکت دیدی، آن را حذف یا طوری تغییر بده که برای این دامنه اعمال نشود.

### ج) کش و قوانین Cloudflare

- در Cloudflare: **Caching** → **Configuration** → **Purge Everything**.
- در **Rules** (مثلاً Redirect Rules یا Page Rules) اگر قانونی دارید که همیشه به HTTPS ریدایرکت می‌کند، مطمئن شوید با Full (strict) تداخل ایجاد نمی‌کند (معمولاً نباید؛ در صورت شک موقتاً غیرفعال کنید و تست کنید).

### د) تست مستقیم روی سرور

از خود سرور بدون عبور از Cloudflare تست کن:

```bash
curl -I -k https://127.0.0.1:443 -H "Host: panel.aifoapp.ir"
```

اگر اینجا **301/302** به همان آدرس یا به http دیدی، مشکل از Nginx یا اپ است. اگر **200** بود، احتمالاً مشکل از Cloudflare یا هدرهاست.

---

## ۶.۲. خطای ۵۲۵ برای api.aifoapp.ir (callback درگاه پرداخت)

اگر آدرس callback زرین‌پال (یا هر درگاه) روی **https://api.aifoapp.ir** است و با خطای **۵۲۵** (SSL Handshake Failed) مواجه می‌شوی، یعنی **Cloudflare** با حالت SSL روی Full/Full (strict) به سرور تو با **HTTPS** وصل می‌شود، ولی روی سرور برای **api.aifoapp.ir** هیچ **گواهی SSL** یا بلوک **listen 443** تعریف نشده است.

دو راه داری:

### راه ۱ (پیشنهادی): گواهی SSL برای api.aifoapp.ir روی سرور

روی سرور یک بار گواهی Let’s Encrypt برای `api.aifoapp.ir` بگیر و اجازه بده Nginx بلوک ۴۴۳ را خودش اضافه کند:

```bash
sudo certbot --nginx -d api.aifoapp.ir
```

اگر از قبل یک فایل کانفیگ برای `api.aifoapp.ir` داری (فقط `listen 80`)، Certbot معمولاً همان فایل را ویرایش و یک بلوک `listen 443 ssl` برای این دامنه اضافه می‌کند. بعد:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

در Cloudflare برای دامنه (یا زیردامنه api) حالت **Full** یا **Full (strict)** را نگه دار. بعد از این، درخواست به `https://api.aifoapp.ir/api/v1/billing/payment/verify?...` باید بدون ۵۲۵ برسد.

### راه ۲ (موقت): Flexible فقط برای api

اگر فعلاً نمی‌خواهی روی سرور برای api.aifoapp.ir گواهی بگیری:

- در Cloudflare برو **SSL/TLS** → **Overview**.
- اگر برای کل دامنه روی Full (strict) هستی، نمی‌توانی فقط برای api زیردامنه Flexible گذاشت مگر با **Configuration Rules** یا **Page Rules** که بر اساس hostname باشد (در برخی پلن‌ها).
- ساده‌ترین کار این است که **یک بار** گواهی را با راه ۱ بگیر تا هم panel هم api با Full (strict) درست کار کنند.

### بعد از رفع ۵۲۵

- آدرس callback در پنل زرین‌پال باید دقیقاً این باشد:  
  `https://api.aifoapp.ir/api/v1/billing/payment/verify`  
  (بدون اسلش آخر و با همان دامنه.)
- یک بار **Purge Cache** در Cloudflare برای این دامنه انجام بده و دوباره پرداخت تست کن.

### تفاوت با «زیر دامنه اختصاصی» در وبلاگ زرین‌پال

صفحهٔ [تنظیم زیر دامنه اختصاصی در زرین‌پال](https://www.zarinpal.com/blog/%D8%AA%D9%86%D8%B8%DB%8C%D9%85-%D8%B2%DB%8C%D8%B1-%D8%AF%D8%A7%D9%85%D9%86%D9%87-%D8%A7%D8%AE%D8%AA%D8%B5%D8%A7%D8%B5%DB%8C-%D8%AF%D8%B1-%D8%B2%D8%B1%DB%8C%D9%86%D9%BE%D8%A7%D9%84/) برای **صفحهٔ پرداخت میزبانی‌شده توسط زرین‌پال** است: یعنی زیردامنه‌ای (مثلاً **pay.example.com**) با **CNAME** به سرور زرین‌پال اشاره می‌کند تا کاربر هنگام پرداخت همان دامنهٔ شما را در آدرس بار ببیند؛ ولی محتوا از سرور زرین‌پال سرو می‌شود.

در **AIMall** ما از **API و callback روی سرور خودمان** استفاده می‌کنیم:

| مورد | زیردامنه | رکورد DNS | مقصد |
|------|----------|-----------|------|
| **Callback و API بک‌اند شما** | `api.aifoapp.ir` | **A** به IP سرور خودتان | سرور شما (NestJS) |
| **صفحه پرداخت میزبانی‌شده زرین‌پال** (اختیاری) | مثلاً `pay.aifoapp.ir` | **CNAME** به مقداری که زرین‌پال در تنظیمات فنی می‌دهد | سرور زرین‌پال |

پس برای callback و verify پرداخت، **api.aifoapp.ir** باید حتماً با رکورد **A** به IP سرور خودتان اشاره کند، نه CNAME به زرین‌پال. اگر بخواهید علاوه بر آن زیردامنهٔ جدا (مثلاً pay) برای صفحهٔ پرداخت میزبانی‌شده داشته باشید، آن یکی را با CNAME طبق راهنمای زرین‌پال اضافه کنید.

---

## ۷. کش Cloudflare

اگر قبلاً سایت با تنظیمات اشتباه لود شده، ممکن است خطا یا صفحهٔ خالی کش شده باشد:

در Cloudflare: **Caching** → **Configuration** → **Purge Everything** (یک بار برای تست).

---

## ۸. خلاصهٔ دستورات مفید روی سرور

```bash
# فایروال
sudo ufw allow 80
sudo ufw allow 443
sudo ufw reload
sudo ufw status

# Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl status nginx

# تست محلی
curl -I http://127.0.0.1:80
```

بعد از هر تغییر در Nginx حتماً `sudo nginx -t` و در صورت سالم بودن `sudo systemctl restart nginx` بزنید.
