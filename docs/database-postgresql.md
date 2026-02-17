# دیتابیس PostgreSQL — راهنمای امن و حرفه‌ای

پروژه برای محیط **production** روی **PostgreSQL** تنظیم شده است (به‌جای SQLite).

---

## چرا PostgreSQL؟

| ویژگی | توضیح |
|--------|--------|
| **امنیت** | پشتیبانی از SSL/TLS برای ارتباط رمزنگاری‌شده، نقش‌ها و دسترسی‌های ریز (GRANT/REVOKE)، امکان رمزنگاری در سطح ستون و پشتیبان‌گیری امن |
| **پایداری** | ACID کامل، همزمانی بالا، مناسب برای تراکنش و دادهٔ حساس |
| **مقیاس‌پذیری** | مناسب برای رشد ترافیک و داده، پشتیبانی از replication و connection pooling |
| **اکوسیستم** | پشتیبانی عالی Prisma، هاست‌های مدیریت‌شده (مثل Neon, Supabase, RDS)، ابزارهای مانیتورینگ و بکاپ |

---

## تنظیم اولیه روی سرور

### ۱. نصب PostgreSQL

- **Ubuntu/Debian:** `sudo apt install postgresql postgresql-contrib`
- **Docker:**  
  `docker run -d --name aimall-pg -e POSTGRES_USER=aimall_user -e POSTGRES_PASSWORD=STRONG_PASS -e POSTGRES_DB=aimall -p 5432:5432 postgres:16-alpine`
- **سرویس ابری:** یک نمونهٔ PostgreSQL در سرویس موردنظر (مثل Neon، Supabase، یا RDS) بسازید و connection string را از پنل کپی کنید.

### ۲. ایجاد کاربر و دیتابیس (کمترین دسترسی)

برای امنیت بهتر، یک **کاربر جدا** با دسترسی فقط به دیتابیس اپلیکیشن بسازید (نه `postgres`):

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE aimall;
CREATE USER aimall_user WITH ENCRYPTED PASSWORD 'یک_رمز_قوی_و_یکتا';

-- فقط به دیتابیس aimall و اسکیمای public
GRANT CONNECT ON DATABASE aimall TO aimall_user;
\c aimall
GRANT USAGE ON SCHEMA public TO aimall_user;
GRANT CREATE ON SCHEMA public TO aimall_user;

-- بعد از اجرای مایگریشن، دسترسی به جداول (اختیاری؛ Prisma با کاربر بالا جداول را می‌سازد)
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aimall_user;
```

خروج: `\q`

---

## اتصال امن (SSL)

در production اتصال به دیتابیس باید با **SSL** باشد.

### رشته اتصال با SSL

```env
# الزام به SSL (بدون بررسی گواهی سرور)
DATABASE_URL="postgresql://aimall_user:PASSWORD@HOST:5432/aimall?schema=public&sslmode=require"

# بررسی گواهی سرور (امن‌تر؛ برای سرویس ابری)
# DATABASE_URL="postgresql://...?schema=public&sslmode=verify-full&sslcert=..."
```

- **سرویس ابری (Neon, Supabase, RDS و غیره):** معمولاً در پنل گزینهٔ «SSL» یا «Secure connection» وجود دارد و رشته اتصال با `sslmode=require` یا مشابه داده می‌شود؛ همان را در `DATABASE_URL` استفاده کنید.
- **سرور خودتان:** با تنظیم `ssl = on` در `postgresql.conf` و گواهی معتبر، از `sslmode=require` یا `verify-full` استفاده کنید.

---

## اجرای مایگریشن و سید

روی سروری که به دیتابیس PostgreSQL دسترسی دارد:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx ts-node prisma/seed.ts
```

- `migrate deploy` فقط مایگریشن‌های pending را اجرا می‌کند (مناسب production).
- برای ساخت دستی جداول بدون Prisma Migrate در یک محیط خاص می‌توانید از اسکریپت داخل `prisma/migrations/20260216120000_init_postgres/migration.sql` استفاده کنید؛ در حالت عادی همان `migrate deploy` کافی است.

---

## پشتیبان‌گیری و بازیابی

- **pg_dump (خود سرور):**  
  `pg_dump -U aimall_user -d aimall -F c -f backup_$(date +%Y%m%d).dump`
- **بازیابی:**  
  `pg_restore -U aimall_user -d aimall -c backup_YYYYMMDD.dump`
- برای سرور ابری، از قابلیت خودکار بکاپ سرویس (مثل PITR در RDS/Neon) استفاده کنید و در صورت نیاز بازیابی را طبق مستندات همان سرویس انجام دهید.

---

## توسعهٔ محلی با PostgreSQL

اگر ترجیح می‌دهید locally هم با Postgres کار کنید:

```bash
# Docker
docker run -d --name aimall-pg -e POSTGRES_USER=aimall -e POSTGRES_PASSWORD=aimall -e POSTGRES_DB=aimall -p 5432:5432 postgres:16-alpine
```

در `.env` محلی:

```env
DATABASE_URL="postgresql://aimall:aimall@localhost:5432/aimall?schema=public"
```

سپس:

```bash
npx prisma migrate dev
npx ts-node prisma/seed.ts
```

---

## چک‌لیست امنیت دیتابیس

- [ ] کاربر دیتابیس جدا از `postgres` با رمز قوی
- [ ] استفاده از SSL در production (`sslmode=require` یا بالاتر)
- [ ] قرار دادن `DATABASE_URL` فقط در env سرور و هرگز در کد یا ریپو
- [ ] پشتیبان‌گیری منظم و تست بازیابی
- [ ] محدود کردن دسترسی شبکه به پورت 5432 (فایروال / security group فقط برای اپ سرور)

با رعایت این موارد، دیتابیس برای پیاده‌سازی روی سرور (مثلاً panel.aifoapp.ir) آماده و امن است.
