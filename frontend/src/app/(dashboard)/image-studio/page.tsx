'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ImageIcon,
  Loader2,
  Download,
  Sparkles,
  Info,
  Coins,
  Zap,
  Palette,
  Search,
  RotateCcw,
  Clock,
  Upload,
  Pencil,
  ImagePlus,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api, getImageDisplayUrl } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';

function getImageModelIcon(modelId: string) {
  if (modelId === 'turbo') return Zap;
  if (modelId.startsWith('flux-')) return Palette;
  return ImageIcon;
}

const STYLES = [
  { value: 'realistic', label: 'واقع‌گرایانه' },
  { value: 'cartoon', label: 'کارتونی' },
  { value: 'oil-painting', label: 'نقاشی روغن' },
  { value: 'minimal', label: 'مینیمال' },
  { value: 'photography', label: 'فتوگرافی' },
  { value: 'fantasy', label: 'فانتزی' },
  { value: 'cyberpunk', label: 'سایبرپانک' },
  { value: 'watercolor', label: 'واترکالر' },
  { value: 'line-art', label: 'خطی' },
  { value: 'pixel', label: 'پیکسل‌آرت' },
];

const SIZE_TIERS = [
  { value: 'small', label: 'کوچک (۲۵۶)' },
  { value: 'medium', label: 'متوسط (۵۱۲)' },
  { value: 'large', label: 'بزرگ (۱۰۲۴)' },
];

const DEFAULT_RATIOS = [
  { value: '1:1', label: 'مربعی (۱:۱)' },
  { value: '4:3', label: 'افقی (۴:۳)' },
  { value: '3:4', label: 'عمودی (۳:۴)' },
  { value: '16:9', label: 'واید (۱۶:۹)' },
  { value: '9:16', label: 'استوری (۹:۱۶)' },
  { value: '3:2', label: 'عکس (۳:۲)' },
  { value: '2:3', label: 'عمودی عکس (۲:۳)' },
];

const QUICK_PROMPTS = [
  'حیوان در طبیعت با نور طلایی',
  'پرتره هنری با نورپردازی دراماتیک',
  'محصول روی پس‌زمینه سفید',
  'منظره کوهستان در غروب',
  'لوگوی مینیمال برای کافه',
];

const EDIT_PRESETS = [
  { value: 'general', label: 'عمومی (طبق پرامپت)' },
  { value: 'remove_bg', label: 'حذف پس‌زمینه' },
  { value: 'separate_subject', label: 'جدا کردن سوژه' },
  { value: 'make_3d', label: 'سه‌بعدی کردن' },
  { value: 'enhance', label: 'بهبود کیفیت' },
  { value: 'style_transfer', label: 'تغییر سبک هنری' },
];

export default function ImageStudioPage() {
  const { currentOrganizationId } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [model, setModel] = useState('flux');
  const [templateId, setTemplateId] = useState('free');
  const [ratio, setRatio] = useState('1:1');
  const [sizeTier, setSizeTier] = useState('medium');
  const [count, setCount] = useState(1);
  const [styleGuide, setStyleGuide] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyStyle, setHistoryStyle] = useState('_all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainTab, setMainTab] = useState<'generate' | 'edit'>('generate');
  const [editMode, setEditMode] = useState<'upload' | 'history'>('upload');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editType, setEditType] = useState('general');
  const [editRatio, setEditRatio] = useState('1:1');
  const [editModel, setEditModel] = useState('flux');
  const [editLoading, setEditLoading] = useState(false);
  const [editResult, setEditResult] = useState<{ imageUrl: string; coinCost: number } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editResultImageError, setEditResultImageError] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: models } = useQuery({ queryKey: ['models', 'image'], queryFn: () => api.getModels('image') });
  const { data: templates } = useQuery({ queryKey: ['image-templates'], queryFn: api.getImageTemplates });
  const { data: ratios } = useQuery({ queryKey: ['image-ratios'], queryFn: api.getImageRatios });
  const { data: estimatedCoins } = useQuery({
    queryKey: ['image-estimate', model, count],
    queryFn: () => api.estimateImage(model, count),
  });
  const { data: history, refetch } = useQuery({
    queryKey: ['image-history', historySearch, historyFrom, historyTo, historyStyle],
    queryFn: () =>
      api.getImageHistory({
        search: historySearch || undefined,
        from: historyFrom || undefined,
        to: historyTo || undefined,
        style: historyStyle && historyStyle !== '_all' ? historyStyle : undefined,
      }),
  });

  const currentPlaceholder =
    templates?.find((t: { id: string; placeholder?: string }) => t.id === templateId)?.placeholder ??
    'تصویر مورد نظر خود را توصیف کنید...';

  const generate = useCallback(
    async (regenerateParams?: { prompt: string; style: string; model: string; ratio: string; sizeTier: string; count: number }) => {
      const p = regenerateParams?.prompt ?? prompt;
      if (!p.trim()) return;
      setLoading(true);
      setResult(null);
      setGenerateError(null);
      setImageLoaded(false);
      setImageError(false);
      setSelectedIndex(0);
      try {
        const effectiveRatio = (regenerateParams?.ratio ?? ratio) || '1:1';
        const effectiveSizeTier = (regenerateParams?.sizeTier ?? sizeTier) || 'medium';
        const data = await api.generateImage({
          prompt: p,
          style: regenerateParams?.style ?? style,
          model: regenerateParams?.model ?? model,
          templateId: templateId !== 'free' ? templateId : undefined,
          ratio: effectiveRatio,
          sizeTier: effectiveSizeTier,
          count: regenerateParams?.count ?? count,
          styleGuide: styleGuide || undefined,
          negativePrompt: negativePrompt || undefined,
          tag: tag || undefined,
          organizationId: currentOrganizationId,
        });
        setResult(data);
        setGenerateError(null);
        toast.success(`تصویر تولید شد (${data.coinCost} سکه)`);
        refetch();
      } catch (err: any) {
        const msg = err?.message || 'خطا در تولید تصویر';
        setGenerateError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [prompt, style, model, templateId, ratio, sizeTier, count, styleGuide, negativePrompt, tag, refetch, currentOrganizationId],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      generate();
    }
  };

  const currentImageUrl = result?.imageUrls
    ? result.imageUrls[selectedIndex]
    : result?.imageUrl;

  const downloadFilename = () => {
    const date = new Date().toISOString().slice(0, 10);
    const slug = (prompt || 'image').slice(0, 30).replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-');
    return `aimall-${date}-${slug}.png`;
  };

  const cost = estimatedCoins?.estimatedCoins ?? result?.coinCost ?? 5;

  const handleEditFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setEditImageUrl(reader.result as string);
    reader.readAsDataURL(file);
    setEditResult(null);
    setEditError(null);
  }, []);

  const runEdit = useCallback(async () => {
    if (!editImageUrl?.trim()) return;
    setEditLoading(true);
    setEditResult(null);
    setEditError(null);
    setEditResultImageError(false);
    setEditProgress(0);
    // شبیه‌سازی پیشرفت: ۰ → ۹۰ در حدود ۲۵ ثانیه
    editProgressIntervalRef.current = setInterval(() => {
      setEditProgress((p) => (p >= 90 ? 90 : p + 1.8));
    }, 500);
    try {
      const data = await api.editImage({
        image: editImageUrl,
        prompt: editPrompt,
        editType: editType !== 'general' ? editType : undefined,
        ratio: editRatio,
        model: editModel,
      });
      if (editProgressIntervalRef.current) {
        clearInterval(editProgressIntervalRef.current);
        editProgressIntervalRef.current = null;
      }
      setEditProgress(100);
      const imageUrl = (data as any)?.imageUrl ?? (data as any)?.data?.imageUrl;
      const coinCost = (data as any)?.coinCost ?? (data as any)?.data?.coinCost ?? 6;
      if (imageUrl) {
        setEditResult({ imageUrl, coinCost });
        toast.success(`ویرایش انجام شد (${coinCost} سکه)`);
      }
      refetch();
    } catch (err: any) {
      if (editProgressIntervalRef.current) {
        clearInterval(editProgressIntervalRef.current);
        editProgressIntervalRef.current = null;
      }
      setEditProgress(0);
      const msg = err?.message || 'خطا در ویرایش تصویر';
      setEditError(msg);
      toast.error(msg);
      const fresh = await refetch();
      const list = fresh?.data ?? history ?? [];
      const latest = Array.isArray(list) && list.length > 0 ? list[0] : null;
      if (latest?.output && latest?.createdAt) {
        const created = new Date(latest.createdAt).getTime();
        if (Date.now() - created < 120_000) {
          setEditResult({ imageUrl: latest.output, coinCost: latest.coinCost ?? 6 });
        }
      }
    } finally {
      setEditLoading(false);
      setTimeout(() => setEditProgress(0), 800);
    }
  }, [editImageUrl, editPrompt, editType, editRatio, editModel, refetch, history]);

  return (
    <div className="space-y-6 text-right w-full max-w-6xl me-auto" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">استودیو تصویر</h1>
        <p className="text-muted-foreground mt-1">تصاویر خلاقانه با هوش مصنوعی بسازید</p>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'generate' | 'edit')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md me-auto ms-0">
          <TabsTrigger value="generate" className="rounded-xl">
            <Sparkles className="w-4 h-4 me-2" />
            تولید تصویر
          </TabsTrigger>
          <TabsTrigger value="edit" className="rounded-xl">
            <Pencil className="w-4 h-4 me-2" />
            ویرایش تصویر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6 space-y-6">
      {/* Templates */}
      {templates && templates.length > 0 && (
        <div className="space-y-2">
          <Label>نوع محتوا</Label>
          <div className="flex flex-wrap gap-2">
            {templates.map((t: { id: string; name: string }) => (
              <Button
                key={t.id}
                variant={templateId === t.id ? 'default' : 'outline'}
                size="sm"
                className="rounded-xl"
                onClick={() => setTemplateId(t.id)}
              >
                {t.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2" style={{ direction: 'rtl' }}>
        <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-right">
            <CardTitle>ورودی</CardTitle>
            <CardDescription>دقیق توصیف کن؛ بازیگوش یا حرفه‌ای — هر دو جواب می‌دهیم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className="space-y-2">
              <Label>توضیح تصویر</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentPlaceholder}
                rows={4}
                className="rounded-xl resize-none"
              />
              <p className="text-[11px] text-muted-foreground">Ctrl+Enter برای تولید سریع</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_PROMPTS.map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 rounded-lg"
                    onClick={() => setPrompt(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>سبک</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نسبت</Label>
                <Select value={ratio} onValueChange={setRatio}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(ratios && ratios.length > 0 ? ratios : DEFAULT_RATIOS).map((r: { value: string; label: string }) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اندازه</Label>
                <Select value={sizeTier} onValueChange={setSizeTier}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_TIERS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>مدل تصویرساز</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="rounded-xl [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                  <SelectValue placeholder="انتخاب مدل">
                    {model &&
                      (() => {
                        const Icon = getImageModelIcon(model);
                        const m = models?.find((x: { id: string }) => x.id === model);
                        return (
                          <>
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            {m ? m.name : model}
                            {m && (
                              <span className="text-amber-600 dark:text-amber-400 text-xs ms-1">
                                ({m.coinCost ?? 5} سکه)
                              </span>
                            )}
                          </>
                        );
                      })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {models?.map((m: { id: string; name: string; coinCost?: number }) => {
                    const Icon = getImageModelIcon(m.id);
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center justify-between gap-3 w-full">
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            {m.name}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 text-xs tabular-nums">
                            {m.coinCost ?? 5} سکه
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تعداد تصویر</Label>
                <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} تصویر
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>برچسب (اختیاری)</Label>
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="مثلاً لوگوها"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>راهنمای سبک (اختیاری)</Label>
              <Input
                value={styleGuide}
                onChange={(e) => setStyleGuide(e.target.value)}
                placeholder="مثلاً همیشه پس‌زمینه سفید"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>اجتناب از (اختیاری)</Label>
              <Input
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="چیزهایی که در تصویر نباشند"
                className="rounded-xl"
              />
            </div>

            {estimatedCoins != null && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Coins className="w-4 h-4" />
                مصرف: {estimatedCoins.estimatedCoins} سکه
                {count > 1 && ` (${count} تصویر)`}
              </p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              حدود ۱۵ تا ۴۵ ثانیه
            </p>

            <div className="flex gap-2 flex-row-reverse">
              <Button
                onClick={() => generate()}
                disabled={loading || !prompt.trim()}
                className="flex-1 rounded-xl"
              >
                {loading ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="me-2 h-4 w-4" />
                )}
                {loading ? 'در حال تولید...' : `تولید (${cost} سکه)`}
              </Button>
            </div>
            {generateError && (
              <p className="text-sm text-destructive mt-2 rounded-lg bg-destructive/10 p-3 border border-destructive/20">
                {generateError}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row-reverse items-center justify-between gap-2 flex-wrap text-right">
            <div>
              <CardTitle>خروجی</CardTitle>
              <CardDescription>تصویر تولیدشده و پرامپت بهینه</CardDescription>
            </div>
            {result && (
              <div className="flex items-center gap-2 flex-row-reverse">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() =>
                    generate({
                      prompt: prompt,
                      style,
                      model,
                      ratio,
                      sizeTier,
                      count: 1,
                    })
                  }
                  disabled={loading}
                >
                  <RotateCcw className="w-4 h-4 me-1" />
                  تولید مجدد
                </Button>
                {currentImageUrl && (
                  <a
                    href={currentImageUrl}
                    download={downloadFilename()}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm"
                  >
                    <Download className="w-4 h-4 me-1" />
                    دانلود
                  </a>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="text-right">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-row-reverse">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>حدود ۱۵ تا ۴۵ ثانیه...</span>
                </div>
              </div>
            ) : result && currentImageUrl ? (
              <div className="space-y-4">
                {result.imageUrls && result.imageUrls.length > 1 ? (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-2 flex-row-reverse">
                      {result.imageUrls.map((url: string, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedIndex(i);
                            setImageLoaded(false);
                            setImageError(false);
                          }}
                          className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                            selectedIndex === i ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          <img src={url} alt="" className="w-20 h-20 object-cover" />
                        </button>
                      ))}
                    </div>
                    <div className="relative rounded-2xl overflow-hidden bg-muted/40">
                      {!imageLoaded && !imageError && (
                        <div className="flex items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {imageError ? (
                        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                          خطا در بارگذاری
                        </div>
                      ) : (
                        <img
                          src={currentImageUrl}
                          alt="Generated"
                          role="button"
                          className={`w-full rounded-xl transition-opacity duration-300 cursor-zoom-in ${imageLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
                          onLoad={() => setImageLoaded(true)}
                          onError={() => setImageError(true)}
                          onClick={() => {
                            const url = getImageDisplayUrl(currentImageUrl) || currentImageUrl;
                            if (url) { setLightboxUrl(url); setLightboxZoom(1); }
                          }}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-muted/40">
                    {!imageLoaded && !imageError && (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {imageError ? (
                      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                        خطا در بارگذاری
                      </div>
                    ) : (
                      <img
                        src={currentImageUrl}
                        alt="Generated"
                        role="button"
                        className={`w-full rounded-xl transition-opacity duration-500 cursor-zoom-in ${imageLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        onClick={() => {
                          const url = getImageDisplayUrl(currentImageUrl) || currentImageUrl;
                          if (url) { setLightboxUrl(url); setLightboxZoom(1); }
                        }}
                      />
                    )}
                  </div>
                )}

                {result.enhancedPrompt && (
                  <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                    <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">پرامپت بهینه‌شده:</p>
                      <p className="text-xs" dir="ltr">
                        {result.enhancedPrompt}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap flex-row-reverse">
                  <Badge variant="secondary">{result.coinCost} سکه</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {result.model}
                  </Badge>
                  {result.dimensions && (
                    <Badge variant="outline" className="text-[10px]">
                      {result.dimensions.w}×{result.dimensions.h}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ImageIcon className="h-16 w-16 opacity-20 mb-4" />
                <p>تصویر اینجا نمایش داده می‌شود</p>
                <p className="text-xs mt-1">توصیف را وارد کنید و دکمه تولید را بزنید</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gallery */}
      <div className="space-y-4 w-full">
        <h2 className="text-xl font-semibold mb-4">گالری</h2>
        <div className="flex flex-wrap gap-2 justify-end">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="جستجو در توضیح یا پرامپت..."
              className="rounded-xl pe-10"
            />
          </div>
          <Input
            type="date"
            value={historyFrom}
            onChange={(e) => setHistoryFrom(e.target.value)}
            className="rounded-xl w-40"
          />
          <Input
            type="date"
            value={historyTo}
            onChange={(e) => setHistoryTo(e.target.value)}
            className="rounded-xl w-40"
          />
          <Select value={historyStyle} onValueChange={setHistoryStyle}>
                <SelectTrigger className="rounded-xl w-36">
                  <SelectValue placeholder="سبک" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">همه سبک‌ها</SelectItem>
                  {STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ direction: 'rtl' }}>
          {history && history.length > 0 ? (
            history.map((item: any) => (
              <Card
                key={item.id}
                className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all rounded-2xl border border-border/80 bg-card/50"
                onClick={() => {
                  setPrompt(item.input);
                  setResult({ imageUrl: item.output, model: item.model, coinCost: item.coinCost });
                  setImageLoaded(true);
                  setImageError(false);
                }}
              >
                <div className="relative aspect-square bg-muted/40">
                  <img
                    src={getImageDisplayUrl(item.output)}
                    alt={item.input}
                    className="w-full h-full object-cover cursor-zoom-in"
                    role="button"
                    loading="lazy"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = getImageDisplayUrl(item.output) || item.output;
                      if (url) { setLightboxUrl(url); setLightboxZoom(1); }
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement)
                        target.parentElement.innerHTML =
                          '<div class="flex items-center justify-center h-full text-muted-foreground text-xs">تصویر در دسترس نیست</div>';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end">
                    <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={getImageDisplayUrl(item.output) || item.output}
                        download={`aimall-${formatDate(item.createdAt).replace(/\s/g, '-')}.png`}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center justify-center gap-1 bg-white/90 text-black rounded px-2 py-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-3 w-3" /> دانلود
                      </a>
                    </div>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs truncate">{item.input}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.coinCost} سکه
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-8">هنوز تصویری در گالری نیست</p>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="edit" className="mt-6 space-y-6 text-right" dir="rtl">
          <div className="grid gap-6 lg:grid-cols-2" style={{ direction: 'rtl' }}>
            <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2 flex-row-reverse">
                  <Pencil className="h-5 w-5" />
                  ویرایش تصویر
                </CardTitle>
                <CardDescription>عکس را آپلود کنید یا از گالری انتخاب کنید، سپس تغییرات را با پرامپت و گزینه‌ها اعمال کنید</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="flex gap-2 flex-row-reverse">
                  <Button
                    type="button"
                    variant={editMode === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-xl"
                    onClick={() => { setEditMode('upload'); setEditImageUrl(null); setEditResult(null); setEditError(null); }}
                  >
                    <Upload className="w-4 h-4 me-1" />
                    آپلود عکس
                  </Button>
                  <Button
                    type="button"
                    variant={editMode === 'history' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-xl"
                    onClick={() => { setEditMode('history'); setEditImageUrl(null); setEditResult(null); setEditError(null); }}
                  >
                    <ImagePlus className="w-4 h-4 me-1" />
                    از تاریخچه
                  </Button>
                </div>

                {editMode === 'upload' && (
                  <>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEditFile}
                    />
                    <div
                      className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      {editImageUrl ? (
                        <img src={editImageUrl} alt="پیش‌نمایش" className="max-h-48 mx-auto rounded-lg object-contain" />
                      ) : (
                        <>
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">کلیک کنید یا عکس را بکشید</p>
                        </>
                      )}
                    </div>
                  </>
                )}

                {editMode === 'history' && (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {history?.slice(0, 12).map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`rounded-lg overflow-hidden border-2 transition-all ${
                          editImageUrl === item.output ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted'
                        }`}
                        onClick={() => { setEditImageUrl(item.output); setEditResult(null); setEditError(null); }}
                      >
                        <img src={getImageDisplayUrl(item.output)} alt="" className="w-full aspect-square object-cover" />
                      </button>
                    ))}
                    {(!history || history.length === 0) && (
                      <p className="col-span-3 text-sm text-muted-foreground py-4">تصویری در تاریخچه نیست</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>مدل ویرایش تصویر</Label>
                  <Select value={editModel} onValueChange={setEditModel}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="انتخاب مدل" />
                    </SelectTrigger>
                    <SelectContent>
                      {(models && models.length > 0 ? models : [{ id: 'flux', name: 'Flux Pro' }]).map((m: { id: string; name: string }) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>پرامپت ویرایش</Label>
                  <Textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="مثلاً: پس‌زمینه را آبی کن، یا سوژه را برجسته‌تر نشان بده..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نوع ویرایش</Label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDIT_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نسبت خروجی</Label>
                  <Select value={editRatio} onValueChange={setEditRatio}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(ratios && ratios.length > 0 ? ratios : DEFAULT_RATIOS).map((r: { value: string; label: string }) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  ۶ سکه برای هر ویرایش
                </p>
                {editLoading && (
                  <div className="space-y-3 rounded-xl bg-muted/40 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                      <span>در حال ویرایش تصویر…</span>
                    </div>
                    <p className="text-xs text-muted-foreground">زمان تقریبی: ۲۰ تا ۴۰ ثانیه</p>
                    <Progress value={editProgress} className="h-2" />
                  </div>
                )}
                {editError && (
                  <p className="text-sm text-destructive rounded-lg bg-destructive/10 p-2">{editError}</p>
                )}
                <Button
                  onClick={runEdit}
                  disabled={editLoading || !editImageUrl}
                  className="w-full rounded-xl"
                >
                  {editLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Pencil className="w-4 h-4 me-2" />}
                  {editLoading ? 'در حال ویرایش...' : 'اعمال ویرایش'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>نتیجه ویرایش</CardTitle>
                <CardDescription>تصویر ویرایش‌شده اینجا نمایش داده می‌شود</CardDescription>
              </CardHeader>
              <CardContent>
                {editLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin mb-3" />
                    <p className="text-sm">در حال پردازش…</p>
                    <p className="text-xs mt-1">حدود ۲۰ تا ۴۰ ثانیه</p>
                  </div>
                ) : editResult?.imageUrl ? (
                  <div className="space-y-4">
                    {!editResultImageError ? (
                      <img
                        src={getImageDisplayUrl(editResult.imageUrl)}
                        alt="نتیجه"
                        className="w-full rounded-xl border border-border/80 max-h-[400px] object-contain"
                        onLoad={() => setEditResultImageError(false)}
                        onError={() => setEditResultImageError(true)}
                      />
                    ) : (
                      <div className="rounded-xl border border-border/80 bg-muted/30 max-h-[400px] min-h-[200px] flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground text-sm">
                        <ImageIcon className="h-12 w-12 opacity-50" />
                        <p>پیش‌نمایش در دسترس نیست. تصویر ذخیره شده است.</p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = getImageDisplayUrl(editResult.imageUrl) || editResult.imageUrl;
                          a.download = `aimall-edit-${Date.now()}.png`;
                          a.click();
                        }}
                      >
                        <Download className="w-4 h-4 me-1" />
                        دانلود
                      </Button>
                      <Badge variant="secondary">{editResult.coinCost} سکه</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Pencil className="h-16 w-16 opacity-20 mb-4" />
                    <p>تصویر ویرایش‌شده اینجا نمایش داده می‌شود</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* گالری در تب ویرایش */}
          <div className="space-y-4 mt-8">
            <h2 className="text-xl font-semibold">گالری</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="جستجو در توضیح یا پرامپت..."
                  className="rounded-xl pe-10"
                />
              </div>
              <Input
                type="date"
                value={historyFrom}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="rounded-xl w-40"
              />
              <Input
                type="date"
                value={historyTo}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="rounded-xl w-40"
              />
              <Select value={historyStyle} onValueChange={setHistoryStyle}>
                <SelectTrigger className="rounded-xl w-36">
                  <SelectValue placeholder="سبک" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">همه سبک‌ها</SelectItem>
                  {STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ direction: 'rtl' }}>
              {history && history.length > 0 ? (
                history.map((item: any) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all rounded-2xl border border-border/80 bg-card/50"
                    onClick={() => {
                      setEditImageUrl(item.output);
                      setEditResult(null);
                      setEditError(null);
                    }}
                  >
                    <div className="relative aspect-square bg-muted/40">
                      <img
                        src={getImageDisplayUrl(item.output)}
                        alt={item.input}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.parentElement)
                            target.parentElement.innerHTML =
                              '<div class="flex items-center justify-center h-full text-muted-foreground text-xs">تصویر در دسترس نیست</div>';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end">
                        <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={getImageDisplayUrl(item.output) || item.output}
                            download={`aimall-${formatDate(item.createdAt).replace(/\s/g, '-')}.png`}
                            target="_blank"
                            rel="noopener"
                            className="flex items-center justify-center gap-1 bg-white/90 text-black rounded px-2 py-1 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3 h-3" /> دانلود
                          </a>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs truncate">{item.input}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.coinCost} سکه
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground col-span-full text-center py-8">هنوز تصویری در گالری نیست</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* لایتباکس تصویر با زوم */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-2 bg-black/90 border-0 overflow-hidden" onPointerDownOutside={() => setLightboxUrl(null)}>
          {lightboxUrl && (
            <>
              <div className="flex items-center justify-end gap-2 mb-2">
                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLightboxZoom((z) => Math.min(z + 0.25, 4))} title="بزرگنمایی">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLightboxZoom((z) => Math.max(z - 0.25, 0.25))} title="کوچکنمایی">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLightboxZoom(1)} title="واقعی">
                  ۱:۱
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white hover:bg-white/20" onClick={() => setLightboxUrl(null)} title="بستن">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="overflow-auto flex items-center justify-center min-h-[50vh]">
                <img
                  src={lightboxUrl}
                  alt=""
                  className="max-w-full max-h-[80vh] w-auto h-auto object-contain select-none transition-transform duration-100"
                  style={{ transform: `scale(${lightboxZoom})` }}
                  draggable={false}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
