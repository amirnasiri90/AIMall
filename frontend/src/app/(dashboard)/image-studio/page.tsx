'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
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
  const [historySearch, setHistorySearch] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyStyle, setHistoryStyle] = useState('_all');
  const [selectedIndex, setSelectedIndex] = useState(0);

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
      setImageLoaded(false);
      setImageError(false);
      setSelectedIndex(0);
      try {
        const data = await api.generateImage({
          prompt: p,
          style: regenerateParams?.style ?? style,
          model: regenerateParams?.model ?? model,
          templateId: templateId !== 'free' ? templateId : undefined,
          ratio: regenerateParams?.ratio ?? ratio,
          sizeTier: regenerateParams?.sizeTier ?? sizeTier,
          count: regenerateParams?.count ?? count,
          styleGuide: styleGuide || undefined,
          negativePrompt: negativePrompt || undefined,
          tag: tag || undefined,
          organizationId: currentOrganizationId,
        });
        setResult(data);
        toast.success(`تصویر تولید شد (${data.coinCost} سکه)`);
        refetch();
      } catch (err: any) {
        toast.error(err?.message || 'خطا در تولید تصویر');
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

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">استودیو تصویر</h1>
        <p className="text-muted-foreground mt-1">تصاویر خلاقانه با هوش مصنوعی بسازید</p>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>ورودی</CardTitle>
            <CardDescription>دقیق توصیف کن؛ بازیگوش یا حرفه‌ای — هر دو جواب می‌دهیم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex gap-2">
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
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>خروجی</CardTitle>
              <CardDescription>تصویر تولیدشده و پرامپت بهینه</CardDescription>
            </div>
            {result && (
              <div className="flex items-center gap-2">
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
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>حدود ۱۵ تا ۴۵ ثانیه...</span>
                </div>
              </div>
            ) : result && currentImageUrl ? (
              <div className="space-y-4">
                {result.imageUrls && result.imageUrls.length > 1 ? (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-2">
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
                          className={`w-full rounded-xl transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
                          onLoad={() => setImageLoaded(true)}
                          onError={() => setImageError(true)}
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
                        className={`w-full rounded-xl transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
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

                <div className="flex items-center gap-2 flex-wrap">
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
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">گالری</h2>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    src={item.output}
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
                        href={item.output}
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
    </div>
  );
}
