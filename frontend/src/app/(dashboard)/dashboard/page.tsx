'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Coins,
  MessageSquare,
  Shield,
  ArrowLeft,
  FileText,
  ImageIcon,
  Mic,
  Bot,
  BookOpen,
  GitBranch,
  AlertTriangle,
  TrendingDown,
  Search,
  BarChart3,
  Mail,
  Building2,
  Loader2,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/utils';

const LOW_BALANCE_THRESHOLD = 30;
const SERVICE_LABELS: Record<string, string> = {
  chat: 'چت',
  text: 'متن',
  image: 'تصویر',
  audio: 'صوت',
  admin: 'مدیر',
  payment: 'پرداخت',
  other: 'سایر',
};

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'صبح بخیر';
  if (h < 18) return 'عصر بخیر';
  return 'شب بخیر';
}

function getRangeDates(range: 'week' | 'month'): { from: string; to: string; label: string } {
  const now = new Date();
  if (range === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return {
      from: start.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
      label: '۷ روز گذشته',
    };
  }
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: startOfMonth.toISOString().slice(0, 10),
    to: endOfMonth.toISOString().slice(0, 10),
    label: 'این ماه',
  };
}

function MiniBarChart({ data }: { data: { date: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="flex items-end gap-1 h-24 mt-2">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 min-w-0 flex flex-col items-center gap-0.5"
          title={`${d.date}: ${d.total} سکه`}
        >
          <div
            className="w-full rounded-t bg-primary/70 transition-all min-h-[2px]"
            style={{ height: `${(d.total / max) * 100}%` }}
          />
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
            {d.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardHomePage() {
  const router = useRouter();
  const { user, currentOrganizationId } = useAuthStore();
  const [range, setRange] = useState<'week' | 'month'>('month');
  const [quickSearch, setQuickSearch] = useState('');

  const queryClient = useQueryClient();
  const { from, to, label } = useMemo(() => getRangeDates(range), [range]);
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview', from, to],
    queryFn: () => api.getDashboardOverview(from, to),
  });
  const { data: menuFlags } = useQuery({
    queryKey: ['menu-flags'],
    queryFn: api.getMenuFlags,
  });
  const { data: profileContext } = useQuery({
    queryKey: ['profile-context', currentOrganizationId ?? ''],
    queryFn: () => api.getProfileContext(currentOrganizationId ?? undefined),
    enabled: !!user && !!currentOrganizationId,
  });
  const { data: myInvitations = [] } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: api.getMyInvitations,
  });
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const handleAcceptInvitation = async (invitationId: string) => {
    setAcceptingId(invitationId);
    try {
      await api.acceptInvitation(invitationId);
      toast.success('دعوت پذیرفته شد');
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    } catch (err: any) {
      toast.error(err?.message || 'خطا');
    } finally {
      setAcceptingId(null);
    }
  };
  const handleRejectInvitation = async (invitationId: string) => {
    setRejectingId(invitationId);
    try {
      await api.rejectInvitation(invitationId);
      toast.success('دعوت رد شد');
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
    } catch (err: any) {
      toast.error(err?.message || 'خطا');
    } finally {
      setRejectingId(null);
    }
  };

  const coins = overview?.balance?.coins ?? user?.coins ?? 0;
  const recentConversations = overview?.recentConversations ?? [];
  const recentTx = overview?.recentTransactions ?? [];
  const usageByService = overview?.usage?.byService ?? {};
  const totalUsage = overview?.usage?.total ?? 0;
  const dailyUsage = overview?.usage?.daily ?? [];
  const conversationCount = overview?.conversationCount ?? 0;

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickSearch.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
    setQuickSearch('');
  };

  const stats = [
    { label: 'اعتبار شما', value: `${formatNumber(coins)} سکه`, icon: Coins, color: 'text-yellow-500' },
    { label: 'گفتگوها', value: formatNumber(conversationCount), icon: MessageSquare, color: 'text-blue-500' },
    { label: `مصرف (${range === 'week' ? '۷ روز' : 'این ماه'})`, value: `${formatNumber(totalUsage)} سکه`, icon: TrendingDown, color: 'text-orange-500' },
    { label: 'نقش', value: overview?.role === 'ADMIN' ? 'مدیر' : 'کاربر', icon: Shield, color: 'text-green-500' },
  ];

  const quickActions = [
    { label: 'شروع گفتگو', href: '/chat', icon: MessageSquare, desc: 'چت با هوش مصنوعی' },
    { label: 'تولید متن', href: '/text-studio', icon: FileText, desc: 'نوشتن حرفه‌ای' },
    { label: 'تولید تصویر', href: '/image-studio', icon: ImageIcon, desc: 'خلق تصاویر' },
    { label: 'پردازش صوت', href: '/audio-studio', icon: Mic, desc: 'تبدیل متن و صدا' },
    { label: 'دستیارها', href: '/agents', icon: Bot, desc: 'دستیارهای تخصصی' },
    { label: 'پایگاه دانش', href: '/knowledge', icon: BookOpen, desc: 'RAG و جستجو' },
    { label: 'ورک‌فلوها', href: '/workflows', icon: GitBranch, desc: 'اتوماسیون' },
  ].filter(
    (a) =>
      (a.href !== '/knowledge' && a.href !== '/workflows' && a.href !== '/agents') ||
      (a.href === '/knowledge' && (menuFlags?.knowledge ?? false)) ||
      (a.href === '/workflows' && (menuFlags?.workflows ?? false)) ||
      (a.href === '/agents' && (!currentOrganizationId || profileContext?.canUseAgents !== false)),
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">داشبورد</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base line-clamp-2">
            {getTimeGreeting()}، {user?.name || 'کاربر'} • AiFO اینجاست — کنجکاو باش، دقیق پیش برو
          </p>
        </div>
        <form onSubmit={handleQuickSearch} className="flex flex-col sm:flex-row gap-2 w-full sm:w-80 shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="جستجو در چت..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="pe-9 w-full"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="w-full sm:w-auto min-h-[44px]">
            برو به چت
          </Button>
        </form>
      </div>

      {coins < LOW_BALANCE_THRESHOLD && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
            <div className="rounded-xl bg-amber-500/20 p-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base">اعتبار شما کم است</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                برای ادامه استفاده از سرویس‌ها، از بخش صورتحساب سکه خریداری کنید.
              </p>
            </div>
            <Button asChild variant="default" size="sm" className="shrink-0 w-full sm:w-auto min-h-[44px]">
              <Link href="/billing">خرید سکه</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {myInvitations.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">دعوت‌های سازمانی</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              شما به سازمان‌های زیر دعوت شده‌اید. با پذیرش، به عنوان عضو به سازمان اضافه می‌شوید.
            </p>
            <ul className="space-y-2">
              {myInvitations.map((inv: any) => (
                <li
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[hsl(var(--glass-border-subtle))] p-3 bg-background/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{inv.organization?.name ?? inv.organizationName}</p>
                      <p className="text-xs text-muted-foreground">
                        نقش: {inv.role === 'ADMIN' ? 'مدیر' : 'عضو'} • {formatDate(inv.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-row-reverse sm:flex-row justify-end sm:justify-start">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAcceptInvitation(inv.id)}
                      disabled={acceptingId !== null || rejectingId !== null}
                      className="min-h-[44px]"
                    >
                      {acceptingId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      <span className="me-1">پذیرش</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectInvitation(inv.id)}
                      disabled={acceptingId !== null || rejectingId !== null}
                      className="min-h-[44px]"
                    >
                      {rejectingId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      رد
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {profileContext && (
        <Card className="border-[hsl(var(--glass-border-subtle))]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">دسترسی‌های شما در سازمان «{profileContext.organizationName}»</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              مدیر سازمان محدودیت‌های زیر را برای شما تعیین کرده است. مصرف فعلی شما در این سازمان:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[hsl(var(--glass-border-subtle))] p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-0.5">چت</p>
                <p className="font-medium">{profileContext.chatCount}{profileContext.limitChats != null ? ` / ${profileContext.limitChats}` : ' (نامحدود)'}</p>
              </div>
              <div className="rounded-xl border border-[hsl(var(--glass-border-subtle))] p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-0.5">تولید تصویر</p>
                <p className="font-medium">{profileContext.imageCount}{profileContext.limitImageGen != null ? ` / ${profileContext.limitImageGen}` : ' (نامحدود)'}</p>
              </div>
              <div className="rounded-xl border border-[hsl(var(--glass-border-subtle))] p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-0.5">تولید متن</p>
                <p className="font-medium">{profileContext.textCount}{profileContext.limitTextGen != null ? ` / ${profileContext.limitTextGen}` : ' (نامحدود)'}</p>
              </div>
              <div className="rounded-xl border border-[hsl(var(--glass-border-subtle))] p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-0.5">دستیارها</p>
                <p className="font-medium">{profileContext.canUseAgents ? 'فعال' : 'غیرفعال'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
                <div className={`rounded-xl bg-[hsl(var(--glass-bg))] backdrop-blur-sm p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold truncate">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">دسترسی سریع</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="min-touch block min-h-[100px] sm:min-h-0">
              <Card className="hover:shadow-glass-lg transition-all duration-300 cursor-pointer h-full min-h-[100px] sm:min-h-0">
                <CardContent className="flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-5 text-center min-h-[100px] sm:min-h-0">
                  <div className="rounded-xl bg-primary/10 backdrop-blur-sm p-3">
                    <action.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">{action.desc}</p>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold truncate">گفتگوهای اخیر</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/chat">همه</Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : !recentConversations.length ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">هنوز گفتگویی ندارید</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/chat">شروع اولین گفتگو</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {recentConversations.map((c: any) => (
                    <Link key={c.id} href={`/chat?conv=${c.id}`} className="block min-touch">
                      <div className="flex items-center justify-between p-4 min-h-[56px] hover:bg-[hsl(var(--glass-bg))] active:bg-muted/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{c.title || 'گفتگوی جدید'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(c.updatedAt ?? c.createdAt)}</p>
                        </div>
                        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 shrink-0" />
              <span className="truncate">مصرف (سکه)</span>
            </h2>
            <Tabs value={range} onValueChange={(v) => setRange(v as 'week' | 'month')}>
              <TabsList className="h-auto p-0.5">
                <TabsTrigger value="week" className="min-h-[40px] px-4 py-2">۷ روز</TabsTrigger>
                <TabsTrigger value="month" className="min-h-[40px] px-4 py-2">این ماه</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Card>
            <CardContent className="pt-4">
              {dailyUsage.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground mb-1">{label}</p>
                  <MiniBarChart data={dailyUsage} />
                </>
              )}
              {Object.keys(usageByService).length === 0 && dailyUsage.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">هنوز مصرفی در این بازه ثبت نشده</p>
                </div>
              ) : (
                <div className="divide-y mt-4">
                  {Object.entries(usageByService)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([service, amount]) => (
                      <div key={service} className="flex items-center justify-between py-2">
                        <span className="text-sm">{SERVICE_LABELS[service] || service}</span>
                        <span className="font-medium">{formatNumber(Number(amount))} سکه</span>
                      </div>
                    ))}
                  <div className="flex items-center justify-between py-2 pt-3 border-t font-medium">
                    <span>جمع</span>
                    <span>{formatNumber(totalUsage)} سکه</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">فعالیت‌های اخیر</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing">مشاهده همه</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : !recentTx.length ? (
              <div className="p-8 text-center text-muted-foreground">
                <Coins className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">تراکنشی ثبت نشده</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/billing">صفحه صورتحساب</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {recentTx.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={tx.type === 'CREDIT' ? 'default' : 'secondary'}>
                        {tx.type === 'CREDIT' ? 'واریز' : 'برداشت'}
                      </Badge>
                      {tx.service && (
                        <span className="text-xs text-muted-foreground">
                          {SERVICE_LABELS[tx.service] || tx.service}
                        </span>
                      )}
                      <span className="text-sm truncate max-w-[180px]">{tx.reason}</span>
                    </div>
                    <div className="text-left shrink-0">
                      <span className={`font-medium ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount}
                      </span>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
