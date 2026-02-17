import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
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
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
