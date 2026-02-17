# تغییر کاربر و رمز دیتابیس PostgreSQL

## ۱. ورود به PostgreSQL

```bash
sudo -u postgres psql
```

## ۲. تغییر رمز کاربر فعلی

اگر می‌خواهید فقط **رمز** کاربر فعلی (مثلاً `aimall_user`) را عوض کنید:

```sql
ALTER USER aimall_user WITH PASSWORD 'رمز_جدید_قوی';
```

خروج: `\q`

## ۳. ساخت کاربر جدید و حذف قدیمی

اگر می‌خواهید **کاربر جدید** با نام و رمز دیگر داشته باشید:

```sql
-- کاربر جدید
CREATE USER نام_کاربر_جدید WITH ENCRYPTED PASSWORD 'رمز_جدید';

-- دسترسی به دیتابیس aimall
GRANT CONNECT ON DATABASE aimall TO نام_کاربر_جدید;
\c aimall
GRANT USAGE ON SCHEMA public TO نام_کاربر_جدید;
GRANT CREATE ON SCHEMA public TO نام_کاربر_جدید;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO نام_کاربر_جدید;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO نام_کاربر_جدید;

-- (اختیاری) حذف کاربر قدیمی بعد از اطمینان
-- DROP USER aimall_user;
\q
```

## ۴. به‌روزرسانی backend/.env

در فایل `backend/.env` مقدار `DATABASE_URL` را با کاربر و رمز جدید تنظیم کنید:

```
DATABASE_URL=postgresql://نام_کاربر:رمز@127.0.0.1:5432/aimall?schema=public
```

مثال:

```
DATABASE_URL=postgresql://aimall_user:رمز_جدید_قوی@127.0.0.1:5432/aimall?schema=public
```

## ۵. ری‌استارت بک‌اند

بعد از تغییر env، سرویس بک‌اند را ری‌استارت کنید:

```bash
pm2 restart aimall-backend
```

یا اگر بدون PM2 اجرا می‌کنید، فرایند را متوقف و دوباره اجرا کنید.
