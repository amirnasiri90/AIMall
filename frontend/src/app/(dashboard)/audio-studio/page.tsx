'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Mic,
  Volume2,
  Loader2,
  Upload,
  FileAudio,
  X,
  Copy,
  Download,
  Search,
  History,
  Coins,
  Sparkles,
  Music2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect } from 'react';

/** وقتی true شود، استودیو صوت فعال است. */
const AUDIO_STUDIO_ENABLED = true;

/** صداهای OpenAI با برچسب فارسی */
const TTS_VOICES_OPENAI = [
  { value: 'alloy', label: 'Alloy', labelFa: 'آلی' },
  { value: 'echo', label: 'Echo', labelFa: 'اکو' },
  { value: 'fable', label: 'Fable', labelFa: 'فِیبل' },
  { value: 'onyx', label: 'Onyx', labelFa: 'اونیکس' },
  { value: 'nova', label: 'Nova', labelFa: 'نووا' },
  { value: 'shimmer', label: 'Shimmer', labelFa: 'شیمر' },
];

const TTS_SPEEDS = [
  { value: 0.5, label: '۰.۵' },
  { value: 0.75, label: '۰.۷۵' },
  { value: 1, label: '۱' },
  { value: 1.25, label: '۱.۲۵' },
  { value: 1.5, label: '۱.۵' },
];

/** پیشنهادهای سریع برای متن TTS (فارسی و انگلیسی) */
const TTS_QUICK_PROMPTS = [
  { text: 'سلام، این یک نمونهٔ متن به گفتار است.', label: 'نمونه فارسی' },
  { text: 'خوش آمدید به استودیو صوت.', label: 'خوش‌آمدگویی' },
  { text: 'امروز هوا خوب است.', label: 'جمله کوتاه' },
  { text: 'Welcome to the audio studio.', label: 'English' },
];

/** سکه هر مدل TTS (هماهنگ با بک‌اند) — بدون درخواست API تا از 404 جلوگیری شود */
const TTS_COINS: Record<string, number> = {
  'openai/tts-1': 3,
  'openai/tts-1-hd': 5,
  'google/cloud-tts': 2,
  'elevenlabs/multilingual-v2': 5,
  'openai/gpt-audio-mini': 4,
  'openai/gpt-4o-audio-preview': 6,
  'openai/gpt-4o-mini-audio-preview': 4,
};
const DEFAULT_TTS_COINS = 3;

/** سکه هر مدل STT */
const STT_COINS: Record<string, number> = {
  'openai/whisper-large-v3': 3,
  'openai/whisper-1': 2,
  'google/speech-to-text': 2,
  'deepgram/nova-2': 2,
};
const DEFAULT_STT_COINS = 2;

/** آدرس‌های قابل پخش در مرورگر (data:, http(s):, blob:). دادهٔ base64 گاهی با فاصله یا encoding برمی‌گردد. */
function isPlayableAudioUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim();
  if (/^(data:|https?:|blob:)/i.test(u)) return true;
  if (u.length > 200 && u.includes('data:audio') && u.includes('base64')) return true;
  return false;
}

export default function AudioStudioPage() {
  const [ttsText, setTtsText] = useState('');
  const [ttsModel, setTtsModel] = useState('openai/gpt-audio-mini');
  const [ttsVoice, setTtsVoice] = useState('alloy');
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsResult, setTtsResult] = useState<{ audioUrl?: string; duration?: number; model?: string; coinCost?: number } | null>(null);
  const [sttFile, setSttFile] = useState<File | null>(null);
  const [sttModel, setSttModel] = useState('openai/whisper-large-v3');
  const [sttLoading, setSttLoading] = useState(false);
  const [sttResult, setSttResult] = useState<{ text?: string; model?: string; coinCost?: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState('_all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [sfxText, setSfxText] = useState('');
  const [sfxLoading, setSfxLoading] = useState(false);
  const [sfxResult, setSfxResult] = useState<{ audioUrl?: string; coinCost?: number } | null>(null);

  useEffect(() => {
    if (!AUDIO_STUDIO_ENABLED) setShowComingSoonModal(true);
  }, []);

  useEffect(() => {
    if (ttsModel.startsWith('elevenlabs/') && ttsOptions?.voices?.length) {
      setTtsVoice((v) => (ttsOptions.voices.some((x) => x.id === v) ? v : ttsOptions.voices[0].id));
    } else if (!ttsModel.startsWith('elevenlabs/')) {
      setTtsVoice((v) => (TTS_VOICES_OPENAI.some((x) => x.value === v) ? v : 'alloy'));
    }
  }, [ttsModel, ttsOptions?.voices]);

  const { data: ttsModels } = useQuery({ queryKey: ['models', 'tts'], queryFn: () => api.getModels('tts') });
  const { data: sttModels } = useQuery({ queryKey: ['models', 'stt'], queryFn: () => api.getModels('stt') });
  const { data: ttsOptions } = useQuery({
    queryKey: ['audio', 'tts-options'],
    queryFn: () => api.getAudioTtsOptions(),
    staleTime: 60_000,
  });

  const ttsModelsMerged = useMemo(() => {
    const base = (ttsModels as { id: string; name: string; coinCost?: number }[]) || [];
    const fromApi = ttsOptions?.elevenlabsModels || [];
    const seen = new Set(base.map((m) => m.id));
    const extra = fromApi
      .filter((m) => !seen.has(`elevenlabs/${m.id}`))
      .map((m) => ({ id: `elevenlabs/${m.id}`, name: m.name, coinCost: m.coinCost ?? 5 }));
    return [...base, ...extra];
  }, [ttsModels, ttsOptions?.elevenlabsModels]);

  const ttsVoicesList = useMemo(() => {
    if (ttsModel.startsWith('elevenlabs/')) {
      const list = ttsOptions?.voices?.length
        ? ttsOptions.voices.map((v) => ({ value: v.id, label: v.nameFa || v.name, labelFa: v.nameFa }))
        : [{ value: '21m00Tcm4TlvDq8ikWAM', label: 'راشل', labelFa: 'راشل' }];
      return list;
    }
    return TTS_VOICES_OPENAI.map((v) => ({ value: v.value, label: v.labelFa || v.label, labelFa: v.labelFa }));
  }, [ttsModel, ttsOptions?.voices]);

  const ttsCost = TTS_COINS[ttsModel] ?? (ttsModel.startsWith('elevenlabs/') ? 5 : DEFAULT_TTS_COINS);
  const sttCost = STT_COINS[sttModel] ?? DEFAULT_STT_COINS;
  const history = useMemo(() => {
    let list = historyList;
    if (historyType && historyType !== '_all') {
      list = list.filter((item: any) => item.type === historyType);
    }
    if (historySearch?.trim()) {
      const q = historySearch.trim().toLowerCase();
      list = list.filter(
        (item: any) =>
          (item.input?.toLowerCase?.() ?? '').includes(q) || (item.output?.toLowerCase?.() ?? '').includes(q),
      );
    }
    return list;
  }, [historyList, historySearch, historyType]);

  const handleTTS = async () => {
    if (!ttsText.trim()) return;
    setTtsLoading(true);
    setTtsResult(null);
    try {
      const data = await api.textToSpeech({
        text: ttsText,
        model: ttsModel,
        voice: ttsVoice,
        speed: ttsSpeed,
      });
      setTtsResult(data);
      setHistoryList((prev) => [
        { id: `tts-${Date.now()}`, type: 'tts', input: ttsText, output: data.audioUrl, model: data.model, coinCost: data.coinCost, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      toast.success(`صوت تولید شد (${data.coinCost ?? 0} سکه)`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTtsLoading(false);
    }
  };

  const acceptedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/webm', 'audio/mp4'];

  const handleFileSelect = useCallback((file: File) => {
    if (!acceptedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm|m4a)$/i)) {
      toast.error('فرمت فایل پشتیبانی نمی‌شود. لطفاً فایل MP3، WAV یا OGG آپلود کنید.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('حجم فایل نباید بیشتر از 25 مگابایت باشد');
      return;
    }
    setSttFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleSTT = async () => {
    if (!sttFile) return;
    setSttLoading(true);
    setSttResult(null);
    try {
      const data = await api.speechToText(sttFile, sttModel);
      setSttResult(data);
      setHistoryList((prev) => [
        { id: `stt-${Date.now()}`, type: 'stt', input: sttFile.name, output: data.text, model: data.model, coinCost: data.coinCost, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      toast.success(`متن استخراج شد (${data.coinCost ?? 0} سکه)`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSttLoading(false);
    }
  };

  const handleSfx = async () => {
    setSfxLoading(true);
    setSfxResult(null);
    try {
      const data = await api.createSoundEffect({ text: sfxText.trim() || 'کلیک نرم' });
      setSfxResult(data);
      setHistoryList((prev) => [
        { id: `sfx-${Date.now()}`, type: 'tts', input: sfxText || 'افکت صوتی', output: data.audioUrl, model: 'sound_effect', coinCost: data.coinCost, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      toast.success(`افکت صوتی ساخته شد (${data.coinCost ?? 0} سکه)`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSfxLoading(false);
    }
  };

  const copySttText = () => {
    if (sttResult?.text) {
      navigator.clipboard.writeText(sttResult.text);
      toast.success('متن کپی شد');
    }
  };

  const downloadSttText = () => {
    if (!sttResult?.text) return;
    const blob = new Blob([sttResult.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('فایل متن دانلود شد');
  };

  const downloadTtsAudio = () => {
    if (!ttsResult?.audioUrl || !isPlayableAudioUrl(ttsResult.audioUrl)) return;
    const a = document.createElement('a');
    a.href = ttsResult.audioUrl;
    a.download = `tts-${Date.now()}.mp3`;
    a.click();
    toast.success('فایل صوتی دانلود شد');
  };

  const loadHistoryItem = (item: { type: string; input?: string; output?: string; model?: string; coinCost?: number }) => {
    if (item.type === 'tts') {
      setTtsText(item.input ?? '');
      setTtsResult({ audioUrl: item.output, model: item.model, coinCost: item.coinCost });
    } else {
      setSttResult({ text: item.output, model: item.model, coinCost: item.coinCost });
    }
  };


  return (
    <div className="relative" dir="rtl">
      {!AUDIO_STUDIO_ENABLED && (
        <>
          <div
            className="absolute inset-0 z-10 backdrop-blur-md bg-background/60 pointer-events-auto rounded-2xl"
            aria-hidden
          />
          <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
            <DialogContent className="text-center">
              <DialogHeader>
                <div className="flex justify-center mb-2">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <DialogTitle className="text-xl">به زودی</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground text-sm">این بخش به زودی در دسترس خواهد بود.</p>
            </DialogContent>
          </Dialog>
        </>
      )}

    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">استودیو صوت</h1>
        <p className="text-muted-foreground mt-1">تبدیل متن به گفتار و بالعکس</p>
      </div>

      <Tabs defaultValue="tts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tts">تبدیل متن به گفتار</TabsTrigger>
          <TabsTrigger value="stt">تبدیل گفتار به متن</TabsTrigger>
          <TabsTrigger value="sfx">افکت صوتی / موسیقی</TabsTrigger>
        </TabsList>

        <TabsContent value="tts" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border-border/80 bg-card/50 overflow-hidden">
              <CardHeader>
                <CardTitle>ورودی</CardTitle>
                <CardDescription>متن مورد نظر برای تبدیل به صدا</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="متن خود را اینجا بنویسید (فارسی یا انگلیسی)..."
                  rows={6}
                  className="rounded-xl"
                />
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground self-center">پیشنهاد متن:</span>
                  {TTS_QUICK_PROMPTS.map((p) => (
                    <Button
                      key={p.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setTtsText(p.text)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>مدل گفتار</Label>
                    <Select value={ttsModel} onValueChange={setTtsModel}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ttsModelsMerged.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex items-center gap-2">
                              <Volume2 className="h-4 w-4 text-muted-foreground" />
                              {m.name}
                              <span className="text-amber-600 dark:text-amber-400 text-xs">({m.coinCost ?? 3} سکه)</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>صدا</Label>
                    <Select value={ttsVoice} onValueChange={setTtsVoice}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ttsVoicesList.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>سرعت</Label>
                  <Select value={String(ttsSpeed)} onValueChange={(v) => setTtsSpeed(Number(v))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTS_SPEEDS.map((s) => (
                        <SelectItem key={String(s.value)} value={String(s.value)}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  <span>تخمین: {ttsCost} سکه</span>
                </div>
                <Button onClick={handleTTS} disabled={ttsLoading || !ttsText.trim()} className="w-full rounded-xl">
                  {ttsLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Volume2 className="me-2 h-4 w-4" />}
                  تولید صوت
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 bg-card/50 overflow-hidden">
              <CardHeader>
                <CardTitle>خروجی</CardTitle>
              </CardHeader>
              <CardContent>
                {ttsResult ? (
                  <div className="space-y-4">
                    <div className="glass-subtle rounded-2xl p-6">
                      {ttsResult.audioUrl && (
                        <div className="space-y-3">
                          {isPlayableAudioUrl(ttsResult.audioUrl) ? (
                            <>
                              <audio
                                ref={audioRef}
                                controls
                                src={ttsResult.audioUrl}
                                className="w-full rounded-xl"
                                preload="metadata"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="rounded-xl" onClick={downloadTtsAudio}>
                                  <Download className="h-4 w-4 me-1" />
                                  دانلود
                                </Button>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">خروجی صوتی این رکورد قابل پخش در مرورگر نیست (آدرس نامعتبر).</p>
                          )}
                        </div>
                      )}
                      {!ttsResult.audioUrl && (
                        <div className="text-center py-4">
                          <Volume2 className="h-12 w-12 mx-auto text-primary mb-2" />
                          <p className="text-sm text-muted-foreground">فایل صوتی تولید شد</p>
                          <p className="text-xs text-muted-foreground mt-1">مدت: {ttsResult.duration ?? 0} ثانیه</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{ttsResult.coinCost ?? 0} سکه</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {ttsResult.model}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Volume2 className="h-16 w-16 opacity-20 mb-4" />
                    <p>خروجی صوتی اینجا نمایش داده می‌شود</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stt" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border-border/80 bg-card/50 overflow-hidden">
              <CardHeader>
                <CardTitle>آپلود صوت</CardTitle>
                <CardDescription>فایل صوتی خود را آپلود کنید</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.ogg,.webm,.m4a,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                {sttFile ? (
                  <div className="border-2 border-primary/30 glass-subtle rounded-2xl p-6 text-center">
                    <FileAudio className="h-12 w-12 mx-auto text-primary mb-3" />
                    <p className="text-sm font-medium">{sttFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(sttFile.size / 1024).toFixed(1)} KB</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setSttFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4 me-1" /> حذف فایل
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      dragOver ? 'border-primary glass-subtle' : 'hover:border-primary hover:bg-[hsl(var(--glass-bg))]'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">فایل صوتی را اینجا بکشید یا کلیک کنید</p>
                    <p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG — حداکثر 25 مگابایت</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>مدل تشخیص گفتار</Label>
                  <Select value={sttModel} onValueChange={setSttModel}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sttModels?.map((m: { id: string; name: string; coinCost?: number }) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-muted-foreground" />
                            {m.name}
                            <span className="text-amber-600 dark:text-amber-400 text-xs">({m.coinCost ?? 2} سکه)</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  <span>تخمین: {sttCost} سکه</span>
                </div>
                <Button onClick={handleSTT} disabled={sttLoading || !sttFile} className="w-full rounded-xl">
                  {sttLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Mic className="me-2 h-4 w-4" />}
                  تبدیل به متن
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 bg-card/50 overflow-hidden">
              <CardHeader>
                <CardTitle>متن استخراج شده</CardTitle>
              </CardHeader>
              <CardContent>
                {sttResult ? (
                  <div className="space-y-4">
                    <div className="glass-subtle rounded-xl p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{sttResult.text}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={copySttText}>
                        <Copy className="h-4 w-4 me-1" />
                        کپی
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={downloadSttText}>
                        <Download className="h-4 w-4 me-1" />
                        دانلود متن
                      </Button>
                      <Badge variant="secondary">{sttResult.coinCost ?? 0} سکه</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {sttResult.model}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Mic className="h-16 w-16 opacity-20 mb-4" />
                    <p>متن استخراج شده اینجا نمایش داده می‌شود</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sfx" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border-border/80 bg-card/50 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="h-5 w-5" />
                  افکت صوتی / موسیقی
                </CardTitle>
                <CardDescription>با ElevenLabs از توضیح متنی، افکت یا صدای پس‌زمینه بسازید (فارسی یا انگلیسی)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={sfxText}
                  onChange={(e) => setSfxText(e.target.value)}
                  placeholder="مثال: صدای باران آرام، موسیقی پس‌زمینه فیلم، کلیک دکمه..."
                  rows={4}
                  className="rounded-xl"
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  <span>۵ سکه برای هر افکت</span>
                </div>
                <Button onClick={handleSfx} disabled={sfxLoading} className="w-full rounded-xl">
                  {sfxLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Music2 className="me-2 h-4 w-4" />}
                  ساخت افکت صوتی
                </Button>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/80 bg-card/50 overflow-hidden">
              <CardHeader>
                <CardTitle>خروجی</CardTitle>
              </CardHeader>
              <CardContent>
                {sfxResult?.audioUrl && isPlayableAudioUrl(sfxResult.audioUrl) ? (
                  <div className="space-y-4">
                    <audio ref={audioRef} src={sfxResult.audioUrl} controls className="w-full rounded-xl" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => {
                          if (sfxResult.audioUrl) {
                            const a = document.createElement('a');
                            a.href = sfxResult.audioUrl;
                            a.download = `sfx-${Date.now()}.mp3`;
                            a.click();
                          }
                        }}
                      >
                        <Download className="h-4 w-4 me-1" />
                        دانلود
                      </Button>
                      <Badge variant="secondary">{sfxResult.coinCost ?? 0} سکه</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Music2 className="h-16 w-16 opacity-20 mb-4" />
                    <p>خروجی افکت صوتی اینجا نمایش داده می‌شود</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* تاریخچه */}
      <Card className="rounded-2xl border-border/80 bg-card/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            تاریخچه صوت
          </CardTitle>
          <CardDescription>جستجو و فیلتر بر اساس نوع و تاریخ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="rounded-xl pe-9"
              />
            </div>
            <Select value={historyType} onValueChange={setHistoryType}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">همه</SelectItem>
                <SelectItem value="tts">متن به گفتار</SelectItem>
                <SelectItem value="stt">گفتار به متن</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 max-h-[320px] overflow-y-auto">
            {history?.length ? (
              history.map((item: any) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => loadHistoryItem(item)}
                  className="text-right rounded-2xl border border-border/80 bg-card/50 p-4 hover:border-primary/40 hover:bg-muted/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant={item.type === 'tts' ? 'default' : 'secondary'} className="text-[10px]">
                      {item.type === 'tts' ? 'TTS' : 'STT'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="text-sm line-clamp-2 text-muted-foreground">
                    {item.type === 'tts' ? item.input : item.input || 'فایل صوتی'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.model} · {item.coinCost} سکه
                  </p>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">موردی در تاریخچه نیست</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
