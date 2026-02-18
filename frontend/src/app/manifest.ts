import type { MetadataRoute } from 'next';

/**
 * آیکون‌های PWA از مسیر همان‌دامنه (پروکسی) لود می‌شوند؛ خودِ route از بک‌اند یا پیش‌فرض برمی‌گرداند.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  return {
    name: 'AiFO - light your path',
    short_name: 'AiFO',
    description: 'همه‌فن‌حریف، زنده، بازیگوش اما دقیق. AiFO — کنجکاوی تو را روشن می‌کند.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f8fafc',
    theme_color: '#3b82f6',
    dir: 'rtl',
    lang: 'fa',
    icons: [
      { src: '/api/branding/pwa?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/branding/pwa?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/api/branding/pwa?size=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
