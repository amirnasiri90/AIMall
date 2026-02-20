'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Video,
  Loader2,
  Download,
  Sparkles,
  Coins,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

const DURATION_OPTIONS = [
  { value: 5, label: '۵ ثانیه' },
  { value: 9, label: '۹ ثانیه' },
  { value: 10, label: '۱۰ ثانیه' },
  { value: 15, label: '۱۵ ثانیه' },
  { value: 20, label: '۲۰ ثانیه' },
  { value: 30, label: '۳۰ ثانیه' },
];

const ASPECT_RATIOS = [
  { value: '16:9', label: 'واید (۱۶:۹)' },
  { value: '1:1', label: 'مربعی (۱:۱)' },
  { value: '9:16', label: 'عمودی (۹:۱۶)' },
  { value: '4:3', label: '۴:۳' },
  { value: '3:4', label: '۳:۴' },
];

const QUICK_PROMPTS = [
  'درختان در باد با نور طلایی غروب',
  'گربه در حال دویدن در چمن',
  'شهر در شب با چراغ‌های نئون',
];

export default function VideoStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ videoUrl?: string; message?: string; coinCost?: number } | null>(null);

  const { data: models } = useQuery({
    queryKey: ['video-models'],
    queryFn: api.getVideoModels,
  });
  const { data: estimatedCoins } = useQuery({
    queryKey: ['video-estimate', model, duration],
    queryFn: () => api.estimateVideo(model || undefined, duration),
  });

  const cost = estimatedCoins?.estimatedCoins ?? 50;

  const generate = useCallback(async () => {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.generateVideo({
        prompt: p,
        model: model || undefined,
        duration,
        aspectRatio,
      });
      setResult(data);
      if (data.videoUrl) {
        toast.success('ویدیو تولید شد');
      } else if (data.message) {
        toast.info(data.message);
      }
    } catch (err: any) {
      toast.error(err?.message || 'خطا در تولید ویدیو');
      setResult({ message: err?.message || 'خطا' });
    } finally {
      setLoading(false);
    }
  }, [prompt, model, duration, aspectRatio]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      generate();
    }
  };

  const downloadFilename = () => {
    const date = new Date().toISOString().slice(0, 10);
    const slug = (prompt || 'video').slice(0, 30).replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-');
    return `aimall-video-${date}-${slug}.mp4`;
  };

  const firstModelId = models?.[0]?.id;
  const effectiveModel = model || firstModelId || '';

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">استودیو ویدئو</h1>
        <p className="text-muted-foreground mt-1">با هوش مصنوعی ویدیو بسازید (مدل Luma)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>ورودی</CardTitle>
            <CardDescription>صحنه یا حرکت مورد نظر را توصیف کنید</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>توضیح ویدیو</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="مثال: درختان در باد با نور طلایی غروب..."
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
              <Label>مدل</Label>
              <Select value={effectiveModel} onValueChange={setModel}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="انتخاب مدل" />
                </SelectTrigger>
                <SelectContent>
                  {models?.map((m: { id: string; name: string; coinCost?: number }) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center justify-between gap-3 w-full">
                        <span>{m.name}</span>
                        <span className="text-amber-600 dark:text-amber-400 text-xs tabular-nums">
                          {m.coinCost ?? 10} سکه/ثانیه
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>مدت (ثانیه)</Label>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نسبت تصویر</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {estimatedCoins != null && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Coins className="w-4 h-4" />
                مصرف تخمینی: {estimatedCoins.estimatedCoins} سکه
              </p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              تولید ویدیو ممکن است ۱ تا ۵ دقیقه طول بکشد
            </p>

            <Button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="w-full rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  در حال تولید ویدیو...
                </>
              ) : (
                <>
                  <Sparkles className="me-2 h-4 w-4" />
                  تولید ویدیو ({cost} سکه)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>خروجی</CardTitle>
            <CardDescription>ویدیو تولیدشده</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>در حال تولید ویدیو (۱ تا ۵ دقیقه)...</span>
                </div>
              </div>
            ) : result?.videoUrl ? (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-muted/40">
                  <video
                    src={result.videoUrl}
                    controls
                    className="w-full rounded-xl"
                    playsInline
                  />
                </div>
                <a
                  href={result.videoUrl}
                  download={downloadFilename()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm"
                >
                  <Download className="w-4 h-4 me-1" />
                  دانلود ویدیو
                </a>
              </div>
            ) : result?.message ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center px-4">
                <Video className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm">{result.message}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Video className="h-16 w-16 opacity-20 mb-4" />
                <p>ویدیو اینجا نمایش داده می‌شود</p>
                <p className="text-xs mt-1">توضیح را وارد کنید و دکمه تولید را بزنید</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
