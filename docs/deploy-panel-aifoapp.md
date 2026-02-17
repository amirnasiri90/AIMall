# پیاده‌سازی روی panel.aifoapp.ir

دامنهٔ پنل: **https://panel.aifoapp.ir**

---

## سناریوهای معمول

### سناریو ۱: فرانت و بک‌اند روی همان سرور (پروکسی با Next)

- کاربر فقط به **https://panel.aifoapp.ir** وصل می‌شود.
- Next.js درخواست‌های `/api/v1/*` را به بک‌اند (مثلاً روی همان سرور، پورت ۳۰۰۱) پروکسی می‌کند.
- در این حالت **نیازی به `NEXT_PUBLIC_API_URL` در فرانت نیست** (در مرورگر از `/api/v1` نسبی استفاده می‌شود).

### سناریو ۲: بک‌اند روی زیردامنهٔ جدا (مثلاً api.aifoapp.ir)

- فرانت: **https://panel.aifoapp.ir**
- API: **https://api.aifoapp.ir**
- در فرانت باید `NEXT_PUBLIC_API_URL=https://api.aifoapp.ir/api/v1` تنظیم شود.

---

## تنظیمات بک‌اند (برای هر دو سناریو)

در **سرور بک‌اند** فایل `.env` را با مقادیر زیر (یا معادل واقعی) پر کنید:

```env
NODE_ENV=production

# دامنهٔ پنل — برای CORS و ریدایرکت بعد از پرداخت
FRONTEND_URL=https://panel.aifoapp.ir

# اگر بک‌اند روی آدرس جدا است (مثلاً api.aifoapp.ir)، این را تنظیم کنید
# وگرنه همان آدرس عمومی سرور بک‌اند را بگذارید (برای callback زرین‌پال و غیره)
BACKEND_URL=https://api.aifoapp.ir
# یا اگر بک‌اند پشت همان دامنه است: BACKEND_URL=https://panel.aifoapp.ir

# اجباری در production — مقدار قوی و یکتا قرار دهید
JWT_SECRET=your-strong-random-jwt-secret-here

# پیشنهاد: حداقل ۱۶ کاراکتر برای رمزنگاری کلیدهای API در DB
API_KEY_ENCRYPTION_KEY=your-encryption-key-min-16-chars

# دیتابیس — PostgreSQL (راهنمای امن: docs/database-postgresql.md)
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/aimall?schema=public&sslmode=require"
DATABASE_URL=postgresql://...

# پورت داخلی بک‌اند (پشت nginx/پروکسی معمولاً 3001)
PORT=3001

# درگاه پرداخت — آدرس بازگشت باید دقیقاً در پنل زرین‌پال هم ثبت شود
ZARINPAL_MERCHANT_ID=...
ZARINPAL_SANDBOX=false
ZARINPAL_CALLBACK_URL=https://api.aifoapp.ir/api/v1/billing/payment/verify
# اگر بک‌اند روی panel است: ZARINPAL_CALLBACK_URL=https://panel.aifoapp.ir/api/v1/billing/payment/verify

# سامانه پیامک و سایر سرویس‌ها
# SMS_IR_API_KEY=...
# FRONTEND_URL قبلاً تنظیم شد
```

---

## تنظیمات فرانت (Next.js)

در **سرور فرانت** (یا همان سرور در سناریو ۱) فایل `.env.production` یا `.env.local`:

### اگر از پروکسی Next استفاده می‌کنید (سناریو ۱)

```env
# خالی بگذارید یا اصلاً نگذارید — در مرورگر از /api/v1 نسبی استفاده می‌شود
# NEXT_PUBLIC_API_URL=
```

### اگر API روی زیردامنهٔ جدا است (سناریو ۲)

```env
NEXT_PUBLIC_API_URL=https://api.aifoapp.ir/api/v1
```

---

## ریدایرکت و CORS

- **ریدایرکت بعد از پرداخت** و **CORS** هر دو از `FRONTEND_URL` استفاده می‌کنند؛ با مقدار `https://panel.aifoapp.ir` فقط همین دامنه مجاز است.
- اگر چند دامنه دارید (مثلاً panel و www):  
  `FRONTEND_URL=https://panel.aifoapp.ir,https://www.aifoapp.ir`

---

## چک‌لیست قبل از استقرار

- [ ] `JWT_SECRET` در بک‌اند با مقدار قوی و یکتا تنظیم شده است.
- [ ] `FRONTEND_URL=https://panel.aifoapp.ir` در بک‌اند تنظیم شده است.
- [ ] در پنل زرین‌پال آدرس بازگشت (callback) مطابق `ZARINPAL_CALLBACK_URL` ثبت شده است.
- [ ] اگر از SSL استفاده می‌کنید، گواهی برای `panel.aifoapp.ir` (و در صورت نیاز `api.aifoapp.ir`) فعال است.
- [ ] در production بک‌اند با `NODE_ENV=production` اجرا می‌شود.

پس از این تنظیمات، با باز کردن **https://panel.aifoapp.ir** باید پنل در دسترس باشد.
