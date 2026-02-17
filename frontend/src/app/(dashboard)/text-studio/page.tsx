'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  ChevronDown,
  Zap,
  FileText,
  Coins,
  Search,
  Shrink,
  Palette,
  PenLine,
  Wand2,
  MessageSquare,
  Bot,
  Globe,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatDate, cn } from '@/lib/utils';

const TONES = [
  { value: 'professional', label: 'حرفه‌ای' },
  { value: 'casual', label: 'محاوره‌ای' },
  { value: 'creative', label: 'خلاقانه' },
  { value: 'academic', label: 'آکادمیک' },
];

const LENGTHS = [
  { value: 'short', label: 'کوتاه' },
  { value: 'medium', label: 'متوسط' },
  { value: 'long', label: 'بلند' },
];

const LANGUAGES = [
  { value: 'fa', label: 'فارسی' },
  { value: 'en', label: 'انگلیسی' },
  { value: 'ar', label: 'عربی' },
];

/** آیکون هر مدل بر اساس provider */
function getModelIcon(modelId: string) {
  if (modelId.startsWith('openai/')) return Sparkles;
  if (modelId.startsWith('anthropic/')) return Bot;
  if (modelId.startsWith('google/')) return Globe;
  if (modelId.startsWith('meta-llama/')) return Cpu;
  return Zap;
}

const ACTIONS = [
  { id: 'continue', label: 'ادامه', icon: ChevronDown },
  { id: 'shorten', label: 'خلاصه', icon: Shrink },
  { id: 'changeTone', label: 'تغییر لحن', icon: Palette },
  { id: 'rewrite', label: 'بازنویسی', icon: PenLine },
  { id: 'improve', label: 'بهبود', icon: Wand2 },
] as const;

export default function TextStudioPage() {
  const { currentOrganizationId } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [language, setLanguage] = useState('fa');
  const [audience, setAudience] = useState('');
  const [styleGuide, setStyleGuide] = useState('');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [templateId, setTemplateId] = useState('free');
  const [variants, setVariants] = useState(1);
  const [useStream, setUseStream] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | string[]>([]);
  const [copied, setCopied] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');

  const { data: models } = useQuery({ queryKey: ['models', 'text'], queryFn: () => api.getModels('text') });
  const { data: templates } = useQuery({ queryKey: ['text-templates'], queryFn: api.getTextTemplates });
  const { data: estimatedCoins } = useQuery({
    queryKey: ['text-estimate', model, variants],
    queryFn: async () => {
      const r = await api.estimateText(model);
      return (r.estimatedCoins || 1) * variants;
    },
  });
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['text-history', historySearch, historyFrom, historyTo],
    queryFn: () => api.getTextHistory({ search: historySearch || undefined, from: historyFrom || undefined, to: historyTo || undefined }),
  });

  const currentPlaceholder = templates?.find((t: { id: string; placeholder?: string }) => t.id === templateId)?.placeholder ?? 'موضوع یا متنی که می‌خواهید تولید شود...';

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      if (useStream) {
        const res = await api.textStreamPost({
          prompt,
          tone,
          length,
          model,
          language: language || undefined,
          audience: audience || undefined,
          styleGuide: styleGuide || undefined,
          organizationId: currentOrganizationId,
        });
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let full = '';
        let buffer = '';
        setOutput('');
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';
            for (const block of events) {
              const line = block.split('\n').find((l) => l.startsWith('data: '));
              if (line) {
                try {
                  const ev = JSON.parse(line.slice(6));
                  if (ev.type === 'chunk' && ev.content) full += ev.content;
                  if (ev.type === 'usage') toast.success(`${ev.coinCost} سکه کسر شد`);
                  if (ev.type === 'error') toast.error(ev.content);
                } catch {}
              }
            }
            setOutput(full);
          }
          if (buffer) {
            const line = buffer.split('\n').find((l) => l.startsWith('data: '));
            if (line) {
              try {
                const ev = JSON.parse(line.slice(6));
                if (ev.type === 'chunk' && ev.content) full += ev.content;
              } catch {}
            }
            setOutput(full);
          }
        }
        refetchHistory();
      } else {
        const result = await api.generateText({
          prompt,
          tone,
          length,
          model,
          templateId: templateId !== 'free' ? templateId : undefined,
          variants: variants > 1 ? variants : undefined,
          language: language || undefined,
          audience: audience || undefined,
          styleGuide: styleGuide || undefined,
          organizationId: currentOrganizationId,
        });
        setOutput(Array.isArray(result.output) ? result.output : [result.output]);
        toast.success(`تولید شد (${result.coinCost} سکه)`);
        refetchHistory();
      }
    } catch (err: any) {
      toast.error(err?.message || 'خطا');
    } finally {
      setLoading(false);
    }
  }, [prompt, tone, length, model, templateId, variants, useStream, language, audience, styleGuide, refetchHistory, currentOrganizationId]);

  const runAction = useCallback(
    async (action: string, toneForChange?: string) => {
      const text = Array.isArray(output) ? output[0] : output;
      if (!text?.trim()) {
        toast.error('ابتدا متنی تولید کنید یا از تاریخچه انتخاب کنید.');
        return;
      }
      setLoading(true);
      try {
        const result = await api.textAction({
          action,
          text,
          tone: action === 'changeTone' ? toneForChange || tone : undefined,
          model,
          organizationId: currentOrganizationId,
        });
        setOutput(result.output);
        toast.success(`${result.coinCost} سکه`);
        refetchHistory();
      } catch (err: any) {
        toast.error(err?.message || 'خطا');
      } finally {
        setLoading(false);
      }
    },
    [output, model, tone, refetchHistory, currentOrganizationId],
  );

  const copyOutput = () => {
    const text = Array.isArray(output) ? output.join('\n\n---\n\n') : output;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('کپی شد');
    }
  };

  const downloadTxt = () => {
    const text = Array.isArray(output) ? output.join('\n\n---\n\n') : output;
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-studio-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('دانلود شد');
  };

  const displayOutput = Array.isArray(output) ? output : output ? [output] : [];
  const hasOutput = displayOutput.length > 0 && displayOutput.some((s) => s?.length > 0);

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">استودیو متن</h1>
        <p className="text-muted-foreground mt-1">متن حرفه‌ای با هوش مصنوعی تولید کنید</p>
      </div>

      {/* Templates */}
      {templates && templates.length > 0 && (
        <div className="space-y-2">
          <Label>نوع محتوا</Label>
          <div className="flex flex-wrap gap-2">
            {templates.map((t: { id: string; name: string; description?: string; placeholder?: string }) => (
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
        {/* Input */}
        <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>ورودی</CardTitle>
            <CardDescription>پرامپت را دقیق بنویس؛ کنجکاوی کن و نتیجه را ببین</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>پرامپت</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={currentPlaceholder}
                rows={5}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>لحن</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>طول</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LENGTHS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>زبان خروجی</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>مخاطب (اختیاری)</Label>
                <Input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="مثلاً نوجوان، B2B"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>راهنمای سبک (اختیاری)</Label>
              <Textarea
                value={styleGuide}
                onChange={(e) => setStyleGuide(e.target.value)}
                placeholder="قوانین ثابت: مثلاً بدون «شما»، استفاده از واژه X به‌جای Y"
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>

            {/* Model selector */}
            <div className="space-y-2">
              <Label>مدل</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="rounded-xl [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                  <SelectValue placeholder="انتخاب مدل">
                    {model && (() => {
                      const Icon = getModelIcon(model);
                      const m = models?.find((x: { id: string }) => x.id === model);
                      return (
                        <>
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          {m ? m.name : model}
                          {m && <span className="text-amber-600 dark:text-amber-400 text-xs ms-1">({m.coinCost ?? 1} سکه)</span>}
                        </>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {models?.map((m: { id: string; name: string; description?: string; coinCost?: number }) => {
                    const Icon = getModelIcon(m.id);
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center justify-between gap-3 w-full">
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            {m.name}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 text-xs tabular-nums">
                            {m.coinCost ?? 1} سکه
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-xs">تعداد پیشنهاد</Label>
                <Select value={String(variants)} onValueChange={(v) => setVariants(Number(v))}>
                  <SelectTrigger className="w-24 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stream"
                  checked={useStream}
                  onChange={(e) => setUseStream(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="stream" className="text-sm cursor-pointer">نمایش زنده (استریم)</Label>
              </div>
            </div>

            {estimatedCoins != null && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Zap className="w-4 h-4" />
                تخمین: حدود {estimatedCoins} سکه برای این درخواست
              </p>
            )}

            <Button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="w-full rounded-xl"
            >
              {loading ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="me-2 h-4 w-4" />
              )}
              تولید متن
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <Card className="border border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>خروجی</CardTitle>
            <div className="flex items-center gap-2">
              {hasOutput && (
                <>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={copyOutput}>
                    {copied ? <Check className="w-4 h-4 me-1" /> : <Copy className="w-4 h-4 me-1" />}
                    {copied ? 'کپی شد' : 'کپی'}
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={downloadTxt}>
                    <Download className="w-4 h-4 me-1" />
                    دانلود .txt
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && !displayOutput.length ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>
            ) : hasOutput ? (
              <>
                {displayOutput.length > 1 ? (
                  <Tabs defaultValue="0" className="w-full">
                    <TabsList className="rounded-xl w-full grid" style={{ gridTemplateColumns: `repeat(${displayOutput.length}, 1fr)` }}>
                      {displayOutput.map((_, i) => (
                        <TabsTrigger key={i} value={String(i)} className="rounded-lg">
                          پیشنهاد {i + 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {displayOutput.map((text, i) => (
                      <TabsContent key={i} value={String(i)} className="mt-3">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed rounded-xl bg-muted/40 p-4 min-h-[120px]">
                          {text}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed rounded-xl bg-muted/40 p-4 min-h-[120px]">
                    {displayOutput[0]}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                  {ACTIONS.map((a) => (
                    <Button
                      key={a.id}
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={loading}
                      onClick={() =>
                        a.id === 'changeTone'
                          ? runAction(a.id, tone)
                          : runAction(a.id)
                      }
                    >
                      <a.icon className="w-3.5 h-3.5 me-1" />
                      {a.label}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-2 opacity-50" />
                <p>خروجی اینجا نمایش داده می‌شود</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          تاریخچه
        </h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="جستجو در ورودی یا خروجی..."
              className="rounded-xl pe-10"
            />
          </div>
          <Input
            type="date"
            value={historyFrom}
            onChange={(e) => setHistoryFrom(e.target.value)}
            placeholder="از تاریخ"
            className="rounded-xl w-40"
          />
          <Input
            type="date"
            value={historyTo}
            onChange={(e) => setHistoryTo(e.target.value)}
            placeholder="تا تاریخ"
            className="rounded-xl w-40"
          />
        </div>
        <div className="space-y-3">
          {history && history.length > 0 ? (
            history.map((item: any) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:border-primary/40 transition-all duration-200 rounded-2xl border border-border/80 bg-card/50"
                onClick={() => {
                  setOutput(item.output);
                  setPrompt(item.input);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.input}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.output}</p>
                    </div>
                    <div className="text-left flex-shrink-0 flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="rounded-lg">
                        {item.coinCost} سکه
                      </Badge>
                      <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">هنوز موردی در تاریخچه نیست</p>
          )}
        </div>
      </div>
    </div>
  );
}
