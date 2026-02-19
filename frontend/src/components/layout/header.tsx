'use client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/store';
import { useState } from 'react';
import { MobileSidebar } from './mobile-sidebar';

export function Header() {
  const { setTheme, resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme ?? 'light';
  const toggleTheme = () => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-20 flex h-16 items-center justify-between glass border-b border-[hsl(var(--glass-border-subtle))] px-4 md:pe-6 md:ps-6 md:right-64">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="relative" aria-label={effectiveTheme === 'dark' ? 'تم روشن' : 'تم تاریک'}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:invisible dark:scale-0 dark:absolute dark:-rotate-90" />
            <Moon className="h-4 w-4 invisible scale-0 absolute rotate-90 transition-all dark:visible dark:rotate-0 dark:scale-100 dark:static" />
            <span className="sr-only">تغییر تم</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name || 'کاربر'}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                نقش: {user?.role === 'ADMIN' ? 'مدیر' : 'کاربر'}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                اعتبار: {user?.coins} سکه
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="me-2 h-4 w-4" />
                خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
