'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useAuthStore, useHydrateAuth } from '@/lib/store';
import { api, setOnUnauthorized } from '@/lib/api';
import { useLogoUrl } from '@/lib/use-branding';
import { GenieRail } from '@/components/layout/genie-rail';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { ProfileSelectModal } from '@/components/profile-select-modal';
import { UpdateNotice } from '@/components/update-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Coins, User, Settings, LogOut, Sun, Moon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntentGuideDialog } from '@/components/intent-guide-dialog';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useHydrateAuth();
  const { token, user, setUser, logout, _hydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme ?? theme ?? 'light';
  const toggleTheme = () => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  const [loading, setLoading] = useState(true);
  const [showRetry, setShowRetry] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [intentGuideOpen, setIntentGuideOpen] = useState(false);
  const logoUrl = useLogoUrl();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const goToLogin = () => {
    logout();
    router.replace('/login');
  };

  useEffect(() => {
    if (!_hydrated || !token) {
      setOnUnauthorized(null);
      return;
    }
    setOnUnauthorized(() => {
      logout();
      toast.error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
      router.replace('/login');
    });
    return () => setOnUnauthorized(null);
  }, [_hydrated, token, logout, router]);

  useEffect(() => {
    if (!_hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setShowRetry(false);
    const timeoutMs = 8000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs)
    );
    const showRetryTimer = setTimeout(() => setShowRetry(true), 4000);
    Promise.race([api.getMe(), timeoutPromise])
      .then((userData) => {
        setUser(userData);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        // در صورت ۴۰۱، onUnauthorized قبلاً logout و redirect انجام داده
      })
      .finally(() => clearTimeout(showRetryTimer));
    return () => clearTimeout(showRetryTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hydrated, token, router, setUser, logout]);

  const retryGetMe = () => {
    setLoading(true);
    setShowRetry(false);
    api.getMe()
      .then((userData) => {
        setUser(userData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  if (!_hydrated || (token && !user)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background p-4">
        {(loading || !showRetry) && (
          <div className="space-y-4 w-64">
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </div>
        )}
        {showRetry && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">اتصال به سرور طول کشید.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="default" onClick={retryGetMe}>
                تلاش مجدد
              </Button>
              <Button variant="outline" onClick={goToLogin}>
                ورود مجدد
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isChat = pathname.startsWith('/chat');

  return (
    <div className={cn('flex flex-col bg-background overflow-x-hidden h-screen', isChat && 'overflow-hidden')}>
      <ProfileSelectModal />
      <UpdateNotice />
      <IntentGuideDialog open={intentGuideOpen} onOpenChange={setIntentGuideOpen} />
      {/* Mobile top bar: only on small screens — min 48px height for touch */}
      <header className="flex md:hidden h-14 min-h-[48px] flex-shrink-0 items-center justify-between gap-2 px-3 sm:px-4 border-b border-border bg-background/80 backdrop-blur-sm safe-area-inset-top">
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setMobileMenuOpen(true)} aria-label="منو">
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <div className="relative h-8 w-8 shrink-0">
            <Image src={logoUrl} alt="AiFO" fill className="object-contain" sizes="32px" unoptimized={logoUrl.startsWith('http') || logoUrl.startsWith('data:')} />
          </div>
          <span className="font-bold text-sm truncate">AiFO</span>
        </Link>
        <div className="flex items-center gap-1 shrink-0 min-w-0">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setIntentGuideOpen(true)} aria-label="میخوای چه کار کنی؟">
            <Sparkles className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 relative"
            onClick={toggleTheme}
            aria-label={effectiveTheme === 'dark' ? 'تم روشن' : 'تم تاریک'}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:invisible dark:scale-0 dark:absolute dark:rotate-90" />
            <Moon className="h-5 w-5 invisible scale-0 absolute rotate-90 transition-all dark:visible dark:rotate-0 dark:scale-100 dark:static" />
          </Button>
          <Link
            href="/billing"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/80 transition-colors min-w-0"
            aria-label="موجودی سکه"
          >
            <Coins className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm font-medium tabular-nums truncate max-w-[4rem]">{user?.coins ?? 0}</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="پروفایل">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="rounded-xl border border-border min-w-[180px]">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium truncate">{user?.name || 'کاربر'}</p>
                <p className="text-xs text-muted-foreground">{user?.coins ?? 0} سکه</p>
              </div>
              <DropdownMenuItem onClick={toggleTheme} onPointerDown={(e) => e.currentTarget.releasePointerCapture(e.pointerId)} className="rounded-lg gap-2 min-h-[44px]">
                {effectiveTheme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                {effectiveTheme === 'dark' ? 'تم روشن' : 'تم تاریک'}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="rounded-lg flex items-center gap-2">
                  <Settings className="h-4 w-4 shrink-0" />
                  تنظیمات
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/billing" className="rounded-lg flex items-center gap-2">
                  <Coins className="h-4 w-4 shrink-0" />
                  صورتحساب و سکه
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive rounded-lg gap-2">
                <LogOut className="h-4 w-4 shrink-0" />
                خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className={cn('flex flex-1 min-h-0 min-w-0 p-2 sm:p-4 gap-2 sm:gap-4', isChat && 'overflow-hidden')}>
        <aside className="hidden md:flex flex-shrink-0 min-h-0 self-stretch">
          <GenieRail onOpenIntentGuide={() => setIntentGuideOpen(true)} />
        </aside>
        <main
          className={cn(
            'flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden overflow-x-hidden',
            !isChat &&
              'rounded-2xl sm:rounded-[28px] glass overflow-auto border border-border'
          )}
        >
          {/* یک ظرف ثابت برای جلوگیری از رفرش/پرش هنگام سوییچ داشبورد ↔ چت */}
          <div
            className={cn(
              'flex-1 flex flex-col min-h-0',
              isChat ? 'p-0 overflow-hidden' : 'p-4 sm:p-6 main-content-mobile pb-safe'
            )}
          >
            <div key={pathname} className="page-transition flex-1 flex flex-col min-h-0">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
