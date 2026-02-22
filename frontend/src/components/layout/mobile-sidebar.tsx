'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { X, LayoutDashboard, MessageSquare, FileText, ImageIcon, Mic, Video, CreditCard, Settings, Shield, Building2, Bot, Code2, LifeBuoy, Coins, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogoUrl } from '@/lib/use-branding';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/chat', label: 'چت هوشمند', icon: MessageSquare },
  { href: '/text-studio', label: 'استودیو متن', icon: FileText },
  { href: '/image-studio', label: 'استودیو تصویر', icon: ImageIcon },
  { href: '/audio-studio', label: 'استودیو صوت', icon: Mic },
  { href: '/video-studio', label: 'استودیو ویدئو', icon: Video },
  { href: '/agents', label: 'دستیارها', icon: Bot },
  { href: '/billing', label: 'صورتحساب', icon: CreditCard },
  { href: '/organizations', label: 'سازمان‌ها', icon: Building2 },
  { href: '/developer', label: 'مستندات API', icon: Code2 },
  { href: '/support', label: 'پشتیبانی', icon: LifeBuoy },
];

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const logoUrl = useLogoUrl();
  const { user, currentOrganizationId } = useAuthStore();
  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: api.listOrganizations,
    enabled: !!user,
  });
  const { data: menuFlags } = useQuery({
    queryKey: ['menu-flags'],
    queryFn: api.getMenuFlags,
    enabled: !!user,
  });
  const { data: profileContext } = useQuery({
    queryKey: ['profile-context', currentOrganizationId ?? ''],
    queryFn: () => api.getProfileContext(currentOrganizationId ?? undefined),
    enabled: !!user && !!currentOrganizationId,
  });
  const showOrganizations = currentOrganizationId != null ? (orgs?.length ?? 0) > 0 : (user?.hasOrganizationPlan ?? false);
  const showNavItem = (href: string) => {
    if (href === '/organizations') return showOrganizations;
    if (href === '/agents' && currentOrganizationId && profileContext?.canUseAgents === false) return false;
    if (href === '/developer') return menuFlags?.developer ?? false;
    return true;
  };

  if (!open) return null;

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="منوی اصلی">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="fixed top-0 right-0 h-full w-[min(280px,85vw)] max-w-[280px] glass-heavy shadow-glass-lg border-l border-[hsl(var(--glass-border))] flex flex-col safe-area-inset-top" dir="rtl">
        <div className="flex h-14 min-h-[52px] items-center justify-between border-b border-[hsl(var(--glass-border-subtle))] px-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative h-8 w-8 flex-shrink-0">
              <Image src={logoUrl} alt="AiFO" fill className="object-contain" sizes="32px" unoptimized={logoUrl.startsWith('http') || logoUrl.startsWith('data:')} />
            </div>
            <span className="text-lg font-bold truncate">AiFO</span>
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onClose} aria-label="بستن منو">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1 p-4">
          {navItems.filter((item) => showNavItem(item.href)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-4 rounded-xl px-4 py-3.5 min-h-[48px] text-base font-medium transition-all duration-200 active:scale-[0.98]',
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground shadow-glass-sm'
                  : 'text-muted-foreground active:bg-[hsl(var(--glass-bg))] hover:bg-[hsl(var(--glass-bg))] hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              onClick={onClose}
              className={cn(
                'flex items-center gap-4 rounded-xl px-4 py-3.5 min-h-[48px] text-base font-medium transition-all duration-200 active:scale-[0.98]',
                pathname === '/admin'
                  ? 'bg-primary text-primary-foreground shadow-glass-sm'
                  : 'text-muted-foreground active:bg-[hsl(var(--glass-bg))] hover:bg-[hsl(var(--glass-bg))] hover:text-accent-foreground'
              )}
            >
              <Shield className="h-5 w-5 shrink-0" />
              پنل مدیریت
            </Link>
          )}
        </nav>
        <div className="flex-shrink-0 border-t border-[hsl(var(--glass-border-subtle))] p-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-muted/50 border border-border/50 min-h-[56px]">
            <span className="w-11 h-11 rounded-full bg-background flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium truncate">{user?.name || 'کاربر'}</p>
              <Link href="/billing" onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-0.5 min-h-[28px]">
                <Coins className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="tabular-nums">{user?.coins ?? 0} سکه</span>
              </Link>
            </div>
          </div>
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-4 rounded-xl px-4 py-3.5 min-h-[48px] text-base font-medium transition-all duration-200 active:scale-[0.98]',
              pathname.startsWith('/settings')
                ? 'bg-primary text-primary-foreground shadow-glass-sm'
                : 'text-muted-foreground active:bg-[hsl(var(--glass-bg))] hover:bg-[hsl(var(--glass-bg))] hover:text-accent-foreground'
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            تنظیمات
          </Link>
        </div>
      </div>
    </div>
  );
}
