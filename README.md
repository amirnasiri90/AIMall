# AI Mall Platform

پلتفرم جامع سرویس‌های هوش مصنوعی - AI Hub + Studio-based Platform

## ویژگی‌ها

- **چت هوشمند** - گفتگوی استریمینگ با مدل‌های مختلف AI
- **استودیو متن** - تولید متن حرفه‌ای با لحن و طول دلخواه
- **استودیو تصویر** - تولید تصاویر خلاقانه
- **استودیو صوت** - تبدیل متن به گفتار و بالعکس
- **سیستم سکه** - مدیریت اعتبار و صورتحساب
- **پرداخت زرین‌پال** - خرید بسته‌های سکه
- **پنل مدیریت** - مدیریت کاربران و آمار مصرف
- **Provider Fallback** - سیستم بازگشتی مدل‌های AI

## تکنولوژی

- **Backend:** NestJS + Prisma + PostgreSQL
- **Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui
- **زبان:** فارسی (RTL)
- **فونت:** Vazirmatn

## راه‌اندازی

### Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## کاربران پیش‌فرض

| ایمیل | رمز عبور | نقش |
|-------|----------|------|
| admin@aimall.ir | admin123 | مدیر |
| user@aimall.ir | user123 | کاربر |

## متغیرهای محیطی

### Backend (.env)

دیتابیس پروژه **PostgreSQL** است (محیط توسعه و production). راهنمای نصب و امنیت: **[docs/database-postgresql.md](docs/database-postgresql.md)**.

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/aimall?schema=public
JWT_SECRET=aimall-demo-secret-key-2024
OPENROUTER_API_KEY=your-key
ZARINPAL_MERCHANT_ID=test-merchant-id
ZARINPAL_SANDBOX=true
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## استقرار روی سرور و گیت‌هاب

### آپلود روی GitHub

۱. یک ریپازیتوری جدید در GitHub بسازید.  
۲. از ریشهٔ پروژه:

```bash
git remote add origin https://github.com/YOUR_USERNAME/AIMall.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

*(قبل از push مطمئن شوید `backend/.env` و `frontend/.env.local` در `.gitignore` هستند و commit نمی‌شوند.)*

### نصب روی سرور (یک‌بار)

۱. روی سرور (مثلاً Ubuntu 22.04) پروژه را کلون کنید:

```bash
git clone https://github.com/YOUR_USERNAME/AIMall.git
cd AIMall
```

۲. نصب‌کننده را اجرا کنید. برای نصب خودکار Node، PostgreSQL و PM2 روی Ubuntu/Debian:

```bash
chmod +x scripts/install.sh
./scripts/install.sh --with-deps
```

اگر Node و PostgreSQL را خودتان نصب کرده‌اید:

```bash
./scripts/install.sh
```

۳. فایل‌های `backend/.env` و در صورت نیاز `frontend/.env.local` را ویرایش کنید (مقادیر واقعی دیتابیس، JWT، دامنه و غیره).

۴. در صورت استفاده از Nginx، پروکسی را طبق **[docs/deploy-panel-aifoapp.md](docs/deploy-panel-aifoapp.md)** یا **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** تنظیم کنید.

معماری استقرار (امروز یک سرور، آینده تفکیک سه سرور بدون از دست دادن داده) و جزئیات بیشتر در **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** آمده است.

### به‌روزرسانی (آپدیت) روی سرور

بعد از هر بار push تغییرات جدید:

```bash
cd AIMall
./scripts/update.sh
```

داده‌های دیتابیس و تنظیمات env دست‌نخورده می‌مانند.

---

## استقرار روی دامنه (panel.aifoapp.ir)

برای پیاده‌سازی روی **https://panel.aifoapp.ir** و تنظیم env، CORS، callback زرین‌پال و سناریوهای پروکسی/زیردامنه، مستند **[docs/deploy-panel-aifoapp.md](docs/deploy-panel-aifoapp.md)** را ببینید.
