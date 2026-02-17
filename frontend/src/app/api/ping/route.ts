import { NextResponse } from 'next/server';

/**
 * تست دسترسی از دستگاه دیگر: از گوشی یا سیستم دیگر
 * http://YOUR_IP:3000/api/ping
 * اگر این آدرس جواب داد، فرانت در دسترس است؛ در غیر این صورت فایروال یا hostname را چک کنید.
 */
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Frontend reachable' });
}
