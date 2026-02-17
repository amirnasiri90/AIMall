# گزارش تست امنیت سایت (اجرای زنده)

تاریخ تست: بهمن ۱۴۰۴ — محیط: localhost (سرورهای بک‌اند و فرانت در حال اجرا)

---

## ۱. احراز هویت و دسترسی

| تست | نتیجه | توضیح |
|-----|--------|--------|
| **GET /api/v1/auth/me بدون توکن** | ✅ 401 Unauthorized | endpoint محافظت‌شده بدون توکن دسترسی نمی‌دهد. |
| **GET /api/v1/admin/users بدون توکن** | ✅ 401 Unauthorized | مسیر ادمین بدون احراز هویت قابل دسترسی نیست. |

---

## ۲. هدرهای امنیتی (API)

درخواست به `GET /api/v1/billing/packages` بررسی شد. هدرهای زیر برگردانده می‌شوند:

| هدر | مقدار | وضعیت |
|-----|--------|--------|
| X-Frame-Options | SAMEORIGIN | ✅ کاهش کلیک‌جکینگ |
| X-Content-Type-Options | nosniff | ✅ کاهش MIME sniffing |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | ✅ HSTS فعال |
| Referrer-Policy | no-referrer | ✅ مناسب |
| Cross-Origin-Resource-Policy | cross-origin | ✅ |
| X-RateLimit-Limit-api | 100 | ✅ محدودیت نرخ فعال است |

---

## ۳. CORS (محیط توسعه)

| تست | نتیجه | توضیح |
|-----|--------|--------|
| درخواست با **Origin: https://evil.com** | ⚠️ `Access-Control-Allow-Origin: https://evil.com` | در حالت فعلی (بدون `NODE_ENV=production` یا بدون `FRONTEND_URL`) سرور هر origin را قبول می‌کند. |

**توصیه:** در **production** حتماً `FRONTEND_URL` را تنظیم کنید تا CORS فقط به دامنهٔ فرانت شما محدود شود (مطابق `docs/SECURITY-AUDIT-REPORT.md` و `docs/deploy-panel-aifoapp.md`).

---

## ۴. وابستگی‌ها (npm audit)

### Backend
- **۱۳ آسیب‌پذیری** (۵ کم، ۳ متوسط، ۵ بالا).
- بیشتر در وابستگی‌های **توسعه/ابزار** (مثل `@nestjs/cli`, `@nestjs/swagger`, `webpack`, `glob`, `inquirer`, `tmp`). در زمان اجرای production فقط `node dist/main` و وابستگی‌های runtime استفاده می‌شوند.
- **Runtime:** زنجیرهٔ `bcrypt` → `@mapbox/node-pre-gyp` → `tar`؛ آسیب‌پذیری‌های `tar` عمدتاً در نصب/بیلد مطرح هستند، نه در زمان اجرای اپ.

رفع کامل بدون شکستن نسخه‌ها با `npm audit fix` ممکن نبود؛ برای به‌روزرسانی‌های breaking باید با ارتقای نسخهٔ Nest/Swagger و غیره همراه باشد.

### Frontend
- **۱ آسیب‌پذیری بالا** در **Next.js** (مربوط به Image Optimizer و RSC deserialization و احتمال DoS).
- رفع با ارتقا به Next 16 (breaking) امکان‌پذیر است.
- در `next.config.mjs` فعلاً فقط `picsum.photos` در `remotePatterns` است؛ محدود بودن دامنه‌ها ریسک را کم می‌کند.

---

## ۵. خلاصه و اقدامات پیشنهادی

- **احراز هویت و مسیر ادمین:** در تست فعلی درست رفتار می‌کنند (۴۰۱ برای endpointهای محافظت‌شده).
- **هدرهای امنیتی API:** با Helmet و محدودیت نرخ در وضعیت خوبی هستند.
- **CORS:** در production با تنظیم `FRONTEND_URL` محدود شود.
- **وابستگی‌ها:** به‌روزرسانی تدریجی (و در صورت نیاز ارتقای نسخهٔ ماژور) برای کاهش تعداد و شدت آسیب‌پذیری‌ها توصیه می‌شود؛ برای ارتقای Next و Nest حتماً چک‌لیست ارتقا و تست رگرسیون انجام شود.

این گزارش بر اساس یک دور تست روی محیط local و بدون استفاده از ابزار نفوذ یا اسکن خودکار خارجی تهیه شده است.
