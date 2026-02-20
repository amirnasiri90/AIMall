/**
 * ایجاد دیتابیس aimall روی PostgreSQL محلی (پورت 15432).
 * یک بار بعد از start-local-pg.ps1 اجرا کنید.
 */
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '127.0.0.1',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});
await client.connect();
const r = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'aimall'"
);
if (r.rows.length === 0) {
  await client.query('CREATE DATABASE aimall');
  console.log('Database "aimall" created.');
} else {
  console.log('Database "aimall" already exists.');
}
await client.end();
