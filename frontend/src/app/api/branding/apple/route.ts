import { NextResponse } from 'next/server';

const DEFAULT_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>";

/** پروکسی آیکون اپل از بک‌اند — همان‌دامنه برای جلوگیری از کش/آدرس اشتباه */
export async function GET() {
  try {
    const base =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://127.0.0.1:${process.env.NEXT_PUBLIC_BACKEND_PORT || '3001'}`;
    const apiBase = base.replace(/\/$/, '') + '/api/v1';
    const res = await fetch(`${apiBase}/branding`, { cache: 'no-store' });
    const data = await res.json();
    const appleUrl = data?.appleTouchIcon ?? null;
    if (!appleUrl) {
      return new NextResponse(DEFAULT_SVG, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    const imgRes = await fetch(appleUrl, { cache: 'no-store' });
    if (!imgRes.ok) {
      return new NextResponse(DEFAULT_SVG, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    const blob = await imgRes.blob();
    const contentType = imgRes.headers.get('content-type') || 'image/png';
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(DEFAULT_SVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
