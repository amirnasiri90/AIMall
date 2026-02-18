import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' fill='#3b82f6'/><text x='256' y='320' font-size='280' text-anchor='middle' fill='white'>🤖</text></svg>";

/** پروکسی آیکون PWA از بک‌اند — ?size=192 یا ?size=512؛ همان‌دامنه برای مانیفست */
export async function GET(request: NextRequest) {
  const size = request.nextUrl.searchParams.get('size') === '512' ? 512 : 192;
  try {
    const base =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://127.0.0.1:${process.env.NEXT_PUBLIC_BACKEND_PORT || '3001'}`;
    const apiBase = base.replace(/\/$/, '') + '/api/v1';
    const res = await fetch(`${apiBase}/branding`, { cache: 'no-store' });
    const data = await res.json();
    const url = size === 512 ? data?.pwa512 : data?.pwa192;
    if (!url) {
      return new NextResponse(DEFAULT_SVG, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    const imgRes = await fetch(url, { cache: 'no-store' });
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
