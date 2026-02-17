import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * سِرو release.json برای پیام آپدیت یک‌بار به کاربر.
 * از فایل public/release.json می‌خواند (یا مقدار پیش‌فرض برمی‌گرداند).
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'release.json');
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as { releaseId?: string };
      return NextResponse.json({ releaseId: data?.releaseId ?? '0' });
    }
  } catch {
    // ignore
  }
  return NextResponse.json({ releaseId: '0' });
}
