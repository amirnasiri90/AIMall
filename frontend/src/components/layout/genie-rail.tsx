'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  LayoutDashboard,
  MessageSquare,
  FileText,
  ImageIcon,
  Mic,
  CreditCard,
  Settings,
  Shield,
  Bot,
  Building2,
  BookOpen,
  GitBranch,
  ListTodo,
  Code2,
  LifeBuoy,
  Coins,
  User,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogoUrl } from '@/lib/use-branding';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/chat', label: 'چت هوشمند', icon: MessageSquare },
  { href: '/text-studio', label: 'استودیو متن', icon: FileText },
  { href: '/image-studio', label: 'استودیو تصویر', icon: ImageIcon },
  { href: '/audio-studio', label: 'استودیو صوت', icon: Mic },
  { href: '/agents', label: 'دستیارها', icon: Bot },
  { href: '/billing', label: 'صورتحساب', icon: CreditCard },
  { href: '/organizations', label: 'سازمان‌ها', icon: Building2 },
  { href: '/knowledge', label: 'پایگاه دانش', icon: BookOpen },
  { href: '/workflows', label: 'ورک‌فلوها', icon: GitBranch },
  { href: '/jobs', label: 'کارهای صف', icon: ListTodo },
  { href: '/developer', label: 'مستندات API', icon: Code2 },
  { href: '/support', label: 'پشتیبانی', icon: LifeBuoy },
];

export function GenieRail() {
  const pathname = usePathname();
  const router = useRouter();
  const logoUrl = useLogoUrl();
  const { theme, setTheme } = useTheme();
  const { user, currentOrganizationId, logout } = useAuthStore();
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
  const showOrganizations = currentOrganizationId != null
    ? (orgs?.length ?? 0) > 0
    : (user?.hasOrganizationPlan ?? false);

  const showNavItem = (href: string) => {
    if (href === '/organizations') return showOrganizations;
    if (href === '/agents' && currentOrganizationId && profileContext?.canUseAgents === false) return false;
    if (href === '/knowledge') return menuFlags?.knowledge ?? false;
    if (href === '/workflows') return menuFlags?.workflows ?? false;
    if (href === '/jobs') return menuFlags?.jobs ?? false;
    if (href === '/developer') return menuFlags?.developer ?? false;
    return true;
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-[200px] h-full min-h-0 flex flex-col items-stretch py-4 gap-4 glass rounded-[28px] border border-border overflow-hidden" dir="rtl">
      <div className="flex-shrink-0 flex flex-col gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors" title="AiFO">
          <div className="relative h-8 w-10 flex-shrink-0">
            <Image src={logoUrl} alt="AiFO" fill className="object-contain object-right" sizes="40px" unoptimized={logoUrl.startsWith('http') || logoUrl.startsWith('data:')} />
          </div>
          <span className="text-base font-bold truncate">AiFO</span>
        </Link>
        <Link
          href="/chat"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          title="چت جدید"
        >
          <span className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5" />
          </span>
          <span className="text-sm font-medium">چت جدید</span>
        </Link>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5">
        {navItems.filter((item) => showNavItem(item.href)).map((item) => {
          const active =
            (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={item.label}
            >
              <span className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                active ? 'bg-primary-foreground/20' : 'bg-transparent'
              )}>
                <item.icon className="w-5 h-5" />
              </span>
              <span className="text-sm font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
        {user?.role === 'ADMIN' && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
              pathname === '/admin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            title="پنل مدیریت"
          >
            <span className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
              pathname === '/admin' ? 'bg-primary-foreground/20' : 'bg-transparent'
            )}>
              <Shield className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium">پنل مدیریت</span>
          </Link>
        )}
      </nav>
      <div className="flex-shrink-0 flex flex-col gap-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium text-foreground">
          <Coins className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="truncate">{user?.coins ?? 0} سکه</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted border border-border hover:bg-accent transition-colors text-foreground w-full text-right"
              title={user?.name || 'کاربر'}
            >
              <span className="w-9 h-9 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium truncate flex-1">{user?.name || 'کاربر'}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="rounded-2xl border border-border bg-popover text-popover-foreground">
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-lg">
              {theme === 'dark' ? <Sun className="w-4 h-4 me-2" /> : <Moon className="w-4 h-4 me-2" />}
              {theme === 'dark' ? 'تم روشن' : 'تم تاریک'}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="rounded-lg flex items-center">
                <Settings className="w-4 h-4 me-2 shrink-0" />
                تنظیمات
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive rounded-lg">
              <LogOut className="w-4 h-4 me-2" />
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
