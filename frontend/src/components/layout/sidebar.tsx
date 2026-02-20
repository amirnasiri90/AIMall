'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { LayoutDashboard, MessageSquare, FileText, ImageIcon, Mic, Video, CreditCard, Shield, Sparkles, Coins, Bot, Building2, BookOpen, GitBranch, ListTodo, Code2, ChevronDown, LifeBuoy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogoUrl } from '@/lib/use-branding';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  { href: '/knowledge', label: 'پایگاه دانش', icon: BookOpen },
  { href: '/workflows', label: 'ورک‌فلوها', icon: GitBranch },
  { href: '/jobs', label: 'کارهای صف', icon: ListTodo },
  { href: '/developer', label: 'مستندات API', icon: Code2 },
  { href: '/support', label: 'پشتیبانی', icon: LifeBuoy },
];

export function Sidebar() {
  const pathname = usePathname();
  const logoUrl = useLogoUrl();
  const { user, currentOrganizationId, setCurrentOrganizationId } = useAuthStore();
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
  // منوی سازمان‌ها: با پروفایل شخصی فقط بعد از خرید بسته سازمانی؛ با پروفایل سازمان اگر عضو باشد نمایش داده می‌شود
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

  useEffect(() => {
    if (!orgs?.length || !currentOrganizationId) return;
    const exists = orgs.some((o: any) => o.id === currentOrganizationId);
    if (!exists) setCurrentOrganizationId(null);
  }, [orgs, currentOrganizationId, setCurrentOrganizationId]);

  return (
    <aside className="fixed top-0 right-0 z-30 hidden h-full w-64 glass-heavy md:flex md:flex-col border-l border-[hsl(var(--glass-border))]">
      <div className="flex h-16 items-center gap-2 border-b border-[hsl(var(--glass-border-subtle))] px-6">
        <div className="relative h-8 w-8 flex-shrink-0">
          <Image src={logoUrl} alt="AiFO" fill className="object-contain" sizes="32px" unoptimized={logoUrl.startsWith('http') || logoUrl.startsWith('data:')} />
        </div>
        <span className="text-lg font-bold">AiFO</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.filter((item) => showNavItem(item.href)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href))
                ? 'bg-primary text-primary-foreground shadow-glass-sm'
                : 'text-muted-foreground hover:bg-[hsl(var(--glass-bg))] hover:text-accent-foreground hover:shadow-glass-sm'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        {user?.role === 'ADMIN' && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              pathname === '/admin'
                ? 'bg-primary text-primary-foreground shadow-glass-sm'
                : 'text-muted-foreground hover:bg-[hsl(var(--glass-bg))] hover:text-accent-foreground hover:shadow-glass-sm'
            )}
          >
            <Shield className="h-4 w-4" />
            پنل مدیریت
          </Link>
        )}
      </nav>

      <div className="border-t border-[hsl(var(--glass-border-subtle))] p-4 space-y-2">
        {orgs && orgs.length > 0 && (
          <Select
            value={currentOrganizationId || '_none_'}
            onValueChange={(v) => setCurrentOrganizationId(v === '_none_' ? null : v)}
          >
            <SelectTrigger className="rounded-xl h-9 text-xs">
              <Building2 className="h-3.5 w-3.5 me-1.5 shrink-0" />
              <SelectValue placeholder="سازمان" />
              <ChevronDown className="h-3.5 w-3.5 me-1" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none_">شخصی</SelectItem>
              {orgs.map((org: any) => (
                <SelectItem key={org.id} value={org.id}>
                  <span className="truncate block max-w-[140px]" title={org.name}>{org.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2 rounded-xl glass-subtle px-3 py-2">
          <Coins className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">{user?.coins ?? 0} سکه</span>
        </div>
        {profileContext && (
          <div className="rounded-xl glass-subtle px-3 py-2 space-y-1.5 border border-[hsl(var(--glass-border-subtle))]">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              محدودیت‌های شما در {profileContext.organizationName}
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>چت: {profileContext.chatCount}{profileContext.limitChats != null ? ` / ${profileContext.limitChats}` : ''}</li>
              <li>تصویر: {profileContext.imageCount}{profileContext.limitImageGen != null ? ` / ${profileContext.limitImageGen}` : ''}</li>
              <li>متن: {profileContext.textCount}{profileContext.limitTextGen != null ? ` / ${profileContext.limitTextGen}` : ''}</li>
              <li>دستیارها: {profileContext.canUseAgents ? 'بله' : 'خیر'}</li>
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
