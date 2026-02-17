'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, useHydrateAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { GenieRail } from '@/components/layout/genie-rail';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { ProfileSelectModal } from '@/components/profile-select-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useHydrateAuth();
  const { token, user, setUser, logout, _hydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!_hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    api
      .getMe()
      .then((userData) => {
        setUser(userData);
        setLoading(false);
      })
      .catch(() => {
        logout();
        router.replace('/login');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hydrated, token, router, setUser, logout]);

  if (!_hydrated || (token && loading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
        </div>
      </div>
    );
  }

  const isChat = pathname.startsWith('/chat');

  return (
    <div className={cn('flex flex-col bg-background overflow-x-hidden h-screen', isChat && 'overflow-hidden')}>
      <ProfileSelectModal />
      {/* Mobile top bar: only on small screens — min 48px height for touch */}
      <header className="flex md:hidden h-14 min-h-[48px] flex-shrink-0 items-center justify-between gap-2 px-3 sm:px-4 border-b border-border bg-background/80 backdrop-blur-sm safe-area-inset-top">
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setMobileMenuOpen(true)} aria-label="منو">
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="relative h-8 w-8 shrink-0">
            <Image src="/logo.png" alt="AiFO" fill className="object-contain" sizes="32px" />
          </div>
          <span className="font-bold text-sm truncate">AiFO</span>
        </Link>
        <div className="w-11 shrink-0" />
      </header>
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className={cn('flex flex-1 min-h-0 min-w-0 p-2 sm:p-4 gap-2 sm:gap-4', isChat && 'overflow-hidden')}>
        <aside className="hidden md:flex flex-shrink-0 min-h-0 self-stretch">
          <GenieRail />
        </aside>
        <main
          className={cn(
            'flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden',
            !isChat &&
              'rounded-2xl sm:rounded-[28px] glass overflow-auto border border-border'
          )}
        >
          {/* یک ظرف ثابت برای جلوگیری از رفرش/پرش هنگام سوییچ داشبورد ↔ چت */}
          <div
            className={cn(
              'flex-1 flex flex-col min-h-0',
              isChat ? 'p-0 overflow-hidden' : 'p-3 sm:p-6'
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
