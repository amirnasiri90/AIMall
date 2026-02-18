import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { PwaViewportLock } from '@/components/pwa/pwa-viewport-lock';
import { InstallPromptBanner } from '@/components/pwa/install-prompt-banner';
import { Toaster } from 'sonner';

const vazirmatn = Vazirmatn({ subsets: ['arabic', 'latin'], display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a5f' },
  ],
};

export const dynamic = 'force-dynamic';

/**
 * فاویکون و آیکون اپل همیشه از مسیر همان‌دامنه (پروکسی) لود می‌شوند تا کش و آدرس درست اعمال شود.
 * خودِ routeها از بک‌اند می‌گیرند یا آیکون پیش‌فرض برمی‌گردانند.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AiFO - light your path',
    description: 'همه‌فن‌حریف، زنده، بازیگوش اما دقیق. AiFO — کنجکاوی تو را روشن می‌کند.',
    icons: {
      icon: '/api/branding/icon',
      apple: '/api/branding/apple',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'AiFO',
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={vazirmatn.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PwaViewportLock />
          <QueryProvider>
            {children}
            <Toaster richColors position="top-left" dir="rtl" />
            <InstallPromptBanner />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
