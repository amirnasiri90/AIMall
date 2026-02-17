'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search, GraduationCap, Dumbbell, MapPin, ShieldCheck, FileText, Layers,
  Target, Languages, ArrowLeft, Sparkles, Lock, Shirt, Home, Wallet, CalendarCheck, Camera, FileOutput,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

const ICON_MAP: Record<string, any> = {
  GraduationCap,
  Dumbbell,
  MapPin,
  ShieldCheck,
  FileText,
  FileOutput,
  Layers,
  Target,
  Languages,
  Shirt,
  Home,
  Wallet,
  CalendarCheck,
  Camera,
};

/** فعال/غیرفعال کردن دستیارهای جدید (فشن، خانه‌داری، مالی، سبک زندگی، اینستاگرام) */
const ENABLE_NEW_AGENTS = true;

/** لیست پیش‌فرض دستیارها (نمایش در صورت خطا یا نبود پاسخ API) تا دستیارهای جدید حتماً در UI دیده شوند */
const FALLBACK_AGENTS: Array<{ id: string; name: string; description: string; tags: string[]; status: string; icon: string; coinCost: number }> = [
  { id: 'student-tutor', name: 'دستیار دانش‌آموز', description: 'معلم هوشمند برای دانش‌آموزان و دانشجویان ایرانی — تدریس، حل تمرین و راهنمایی گام‌به‌گام', tags: ['آموزش', 'ریاضی', 'علوم', 'تمرین'], status: 'active', icon: 'GraduationCap', coinCost: 2 },
  { id: 'fitness-diet', name: 'دستیار ورزش، تناسب اندام و رژیم', description: 'برنامه تمرینی، تغذیه و پیگیری برای کاربران ایرانی — بدون تجویز پزشکی، با تمرکز روی عادت پایدار و ایمنی', tags: ['ورزش', 'تناسب اندام', 'رژیم', 'تغذیه', 'برنامه تمرینی'], status: 'active', icon: 'Dumbbell', coinCost: 2 },
  { id: 'travel-tourism', name: 'دستیار گردشگری، سفر و ماجراجویی', description: 'برنامه‌ریز سفر، پیشنهاد مقصد، طراحی برنامه روزبه‌روز و نکات فرهنگی — سفر داخلی و خارجی هوشمند و اقتصادی', tags: ['سفر', 'گردشگری', 'مقصد', 'برنامه سفر', 'طبیعت‌گردی', 'ایران'], status: 'active', icon: 'MapPin', coinCost: 2 },
  { id: 'academic-integrity', name: 'مشاور صداقت علمی', description: 'بررسی و راهنمایی درباره اصول نگارش علمی، مراجع‌دهی و جلوگیری از سرقت ادبی', tags: ['دانشگاه', 'نگارش', 'پژوهش'], status: 'coming_soon', icon: 'ShieldCheck', coinCost: 2 },
  { id: 'pdf-qa', name: 'دستیار PDF و سند', description: 'آپلود کتاب یا جزوه PDF و پرسش و پاسخ هوشمند از محتوای آن', tags: ['PDF', 'مطالعه', 'خلاصه'], status: 'coming_soon', icon: 'FileText', coinCost: 3 },
  { id: 'flashcards', name: 'فلش‌کارت و خلاصه امتحانی', description: 'ساخت خودکار فلش‌کارت و خلاصه امتحانی از متن درسی شما', tags: ['فلش‌کارت', 'امتحان', 'مرور'], status: 'coming_soon', icon: 'Layers', coinCost: 2 },
  { id: 'practice-gen', name: 'تولید تمرین تطبیقی', description: 'تولید سوالات تمرینی متناسب با سطح شما که تدریجاً سخت‌تر می‌شوند', tags: ['تمرین', 'آزمون', 'تطبیقی'], status: 'coming_soon', icon: 'Target', coinCost: 2 },
  { id: 'english-tutor', name: 'معلم زبان انگلیسی', description: 'آموزش زبان انگلیسی شامل گرامر، لغت، مکالمه و آمادگی آیلتس/تافل', tags: ['انگلیسی', 'گرامر', 'آیلتس'], status: 'coming_soon', icon: 'Languages', coinCost: 2 },
  { id: 'fashion', name: 'فشن و مد', description: 'ساخت ست، مشاوره استایل، تحلیل عکس، خرید هوشمند و کمد دیجیتال', tags: ['فشن', 'استایل', 'ست‌ساز', 'کمد دیجیتال'], status: 'active', icon: 'Shirt', coinCost: 2 },
  { id: 'home', name: 'خانه‌داری و آشپزی', description: 'پیشنهاد غذا با مواد موجود، دستور پخت مرحله‌ای، برنامه غذایی و لیست خرید', tags: ['آشپزی', 'خانه‌داری', 'دستور پخت', 'برنامه غذایی'], status: 'active', icon: 'Home', coinCost: 2 },
  { id: 'finance', name: 'سرمایه‌گذاری و مالی', description: 'تحلیل آموزشی، سناریوسازی، واچ‌لیست و ژورنال معاملاتی', tags: ['سرمایه‌گذاری', 'مالی', 'واچ‌لیست', 'تحلیل'], status: 'active', icon: 'Wallet', coinCost: 2 },
  { id: 'lifestyle', name: 'سبک زندگی و روتین روزانه', description: 'برنامه‌ریزی روزانه، تسک‌ها، روتین و پیگیری عادت', tags: ['روتین', 'تسک', 'عادت', 'برنامه‌ریزی'], status: 'active', icon: 'CalendarCheck', coinCost: 2 },
  { id: 'instagram-admin', name: 'یار ادمین اینستاگرام', description: 'تقویم محتوا، سناریو ریلز، کپشن و هشتگ، پاسخ دایرکت با لحن برند', tags: ['اینستاگرام', 'محتوا', 'ریلز', 'برند'], status: 'active', icon: 'Camera', coinCost: 2 },
  { id: 'persian-pdf-maker', name: 'تبدیل به PDF (فارسی)', description: 'متن یا فایل Word فارسی را با کیفیت استاندارد به PDF تبدیل کن.', tags: ['PDF', 'فارسی', 'RTL'], status: 'active', icon: 'FileOutput', coinCost: 0 },
];

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { data: apiAgents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: api.getAgents,
    retry: 1,
  });

  const NEW_AGENT_IDS = ['fashion', 'home', 'finance', 'lifestyle', 'instagram-admin'];
  const agents = (() => {
    const fromApi = Array.isArray(apiAgents) ? apiAgents : [];
    const idsFromApi = new Set((fromApi as any[]).map((a: any) => a.id));
    const missing = FALLBACK_AGENTS.filter((fa) => !idsFromApi.has(fa.id));
    let merged = [...fromApi, ...missing];
    if (!ENABLE_NEW_AGENTS) merged = merged.filter((a: any) => !NEW_AGENT_IDS.includes(a.id));
    return merged.length > 0 ? merged : FALLBACK_AGENTS.filter((a) => !NEW_AGENT_IDS.includes(a.id));
  })() as typeof FALLBACK_AGENTS;

  const filteredAgents = (agents?.filter((a: any) => {
    const tags = Array.isArray(a.tags) ? a.tags : [];
    return (
      (a.name && a.name.includes(search)) ||
      (a.description && a.description.includes(search)) ||
      tags.some((t: string) => String(t).includes(search))
    );
  }) ?? []).sort((a: any, b: any) => {
    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    return (a.name || '').localeCompare(b.name || '', 'fa');
  });

  const getSlug = (id: string) => `/agents/${id}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          دستیارها
        </h1>
        <p className="text-muted-foreground mt-2">همه‌فن‌حریف و دقیق — دستیارهایی که کنجکاوی تو را جواب می‌دهند</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی دستیار..."
          className="pr-10"
        />
      </div>

      {/* Grid — همیشه از لیست ادغام‌شده استفاده می‌کنیم تا دستیار ورزش/رژیم و بقیه حتماً نمایش داده شوند */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto opacity-20 mb-3" />
          <p>با این عبارت چیزی پیدا نشد — دقیق‌تر جستجو کن یا یکی از دستیارها را انتخاب کن</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent: any) => {
            const IconComp = ICON_MAP[agent.icon] || Sparkles;
            const isActive = agent.status === 'active';
            return (
              <Card
                key={agent.id}
                className={`relative group transition-all duration-300 ${
                  isActive
                    ? 'hover:shadow-glass-lg cursor-pointer'
                    : 'opacity-70'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center backdrop-blur-sm ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-[hsl(var(--glass-bg))] text-muted-foreground'
                    }`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    {isActive ? (
                      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/10">
                        فعال
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="h-3 w-3 me-1" />
                        به‌زودی
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-3">{agent.name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed line-clamp-2">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{agent.coinCost} سکه / پیام</span>
                    <Button
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      disabled={!isActive}
                      onClick={() => isActive && router.push(getSlug(agent.id))}
                    >
                      {isActive ? (
                        <>
                          <ArrowLeft className="h-3.5 w-3.5 me-1.5" />
                          باز کردن
                        </>
                      ) : (
                        'به‌زودی'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
