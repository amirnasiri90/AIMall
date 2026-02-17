# اجرای مایگریشن PostgreSQL

وقتی **PostgreSQL** در دسترس است (محلی، Docker، یا سرویس ابری):

1. در **`.env`** آدرس دیتابیس را تنظیم کنید:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/aimall?schema=public"
   ```

2. در پوشهٔ **backend** این دستورات را به ترتیب اجرا کنید:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate:deploy
   npm run prisma:seed
   ```

- `prisma:migrate:deploy` همان **مایگریشن‌های موجود** در `prisma/migrations` را روی دیتابیس اعمال می‌کند.
- اگر دیتابیس خالی است، فقط مایگریشن `20260216120000_init_postgres` اجرا می‌شود.
