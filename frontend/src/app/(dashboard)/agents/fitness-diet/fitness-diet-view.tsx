'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dumbbell, Send, Loader2, User, Copy, Check,
  RotateCcw, Settings2, Zap, Coins, ShieldCheck, ShieldOff,
  ChevronLeft, PanelLeftClose, PanelLeftOpen, Save, Trash2, Clock, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { markdownComponents } from './markdown-components';

const LEVELS = [
  { value: 'simple', label: 'مبتدی', icon: '🟢' },
  { value: 'standard', label: 'متوسط', icon: '🟡' },
  { value: 'advanced', label: 'پیشرفته', icon: '🔴' },
];

const STYLES = [
  { value: 'brief', label: 'کوتاه' },
  { value: 'detailed', label: 'مفصل' },
  { value: 'with_alternatives', label: 'با جایگزین' },
];

const MODES = [
  { value: 'fast', label: 'سریع', icon: Zap, desc: '2 سکه', badge: 'Fast' },
  { value: 'eco', label: 'اقتصادی', icon: Coins, desc: '1 سکه', badge: 'Eco' },
  { value: 'accurate', label: 'دقیق', icon: Dumbbell, desc: '4 سکه', badge: 'Acc' },
];

const GOALS = [
  { value: 'none', label: 'بدون فیلتر' },
  { value: 'weight_loss', label: 'کاهش وزن' },
  { value: 'muscle', label: 'عضله‌سازی' },
  { value: 'general', label: 'تناسب عمومی' },
];

const PLACES = [
  { value: 'none', label: 'نامشخص' },
  { value: 'home', label: 'خانه' },
  { value: 'gym', label: 'باشگاه' },
  { value: 'both', label: 'هر دو' },
];

const TIME_OPTIONS = [
  { value: 'none', label: 'نامشخص' },
  { value: '15', label: '۱۵ دقیقه' },
  { value: '30', label: '۳۰ دقیقه' },
  { value: '45', label: '۴۵ دقیقه' },
  { value: '60', label: '۶۰ دقیقه' },
];

const QUICK_PROMPTS = [
  { label: 'برنامه هفتگی بده', text: 'بر اساس تنظیماتم یه برنامه هفتگی تمرین و تغذیه بهم بده.' },
  { label: 'نکته تغذیه امروز', text: 'یک نکته ساده تغذیه برای امروز بهم بگو.' },
  { label: 'چک‌این', text: 'امروز چی کار کردم؟ می‌خوام چک‌این کنم و بازخورد بگیرم.' },
  { label: 'جایگزین حرکت', text: 'یک حرکت جایگزین برای امروز (با توجه به محل و زمانم) پیشنهاد بده.' },
];

const MODE_BADGE: Record<string, { label: string; className: string }> = {
  fast: { label: 'Fast', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  eco: { label: 'Eco', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  accurate: { label: 'Accurate', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
};

export interface SavedProfile {
  id: string;
  name: string;
  savedAt: number;
  settings: { level: string; style: string; mode: string; goal: string; safetyMode: boolean; place: string; timePerDay: string };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  coinCost?: number;
}

export interface FitnessDietViewModel {
  level: string;
  setLevel: (v: string) => void;
  style: string;
  setStyle: (v: string) => void;
  mode: string;
  setMode: (v: string) => void;
  goal: string;
  setGoal: (v: string) => void;
  safetyMode: boolean;
  setSafetyMode: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  place: string;
  setPlace: (v: string) => void;
  timePerDay: string;
  setTimePerDay: (v: string) => void;
  savedProfiles: SavedProfile[];
  profileNameToSave: string;
  setProfileNameToSave: (v: string) => void;
  allMessages: Message[];
  streaming: boolean;
  streamText: string;
  streamMeta: { model?: string; coinCost?: number } | null;
  copiedId: string | null;
  message: string;
  setMessage: (v: string) => void;
  sendMessage: (overrideText?: string) => void;
  copyMessage: (id: string, content: string) => void;
  runQuickPrompt: (text: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  startNewSession: () => void;
  saveCurrentProfile: () => void;
  loadProfile: (p: SavedProfile) => void;
  deleteProfile: (id: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  msgsLoading: boolean;
  router: { push: (path: string) => void };
}

export function FitnessDietView({ vm }: { vm: FitnessDietViewModel }) {
  const {
    level, setLevel, style, setStyle, mode, setMode, goal, setGoal,
    safetyMode, setSafetyMode, settingsOpen, setSettingsOpen,
    place, setPlace, timePerDay, setTimePerDay,
    savedProfiles, profileNameToSave, setProfileNameToSave,
    allMessages, streaming, streamText, streamMeta, copiedId,
    message, setMessage, sendMessage, copyMessage, runQuickPrompt, handleKeyDown,
    startNewSession, saveCurrentProfile, loadProfile, deleteProfile,
    messagesEndRef, textareaRef, msgsLoading, router,
  } = vm;

  return (
    <section className="flex h-[calc(100vh-7rem)] gap-0 overflow-hidden rounded-2xl glass glass-shine">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 p-4 border-b border-[hsl(var(--glass-border-subtle))]">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            {settingsOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="h-8 w-8 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-none">دستیار ورزش، تناسب اندام و رژیم</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">برنامه تمرینی، تغذیه و پیگیری</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push('/agents')}>
            <ChevronLeft className="h-3.5 w-3.5 me-1" />
            بازگشت
          </Button>
        </div>

        <Card className="flex-1 overflow-hidden border-0 rounded-none shadow-none !bg-transparent !backdrop-blur-none [&::before]:hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 max-w-3xl mx-auto" dir="ltr">
              {allMessages.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl glass-subtle flex items-center justify-center mb-4">
                    <Dumbbell className="h-8 w-8 text-primary/40" />
                  </div>
                  <h3 className="text-base font-medium mb-1" dir="rtl">سلام! چطور می‌تونم کمکت کنم؟ 💪</h3>
                  <p className="text-xs text-center max-w-sm" dir="rtl">
                    برنامه تمرینی، تغذیه و پیگیری — بدون تجویز پزشکی. از منوی راست سطح، هدف و سبک پاسخ را انتخاب کن.
                  </p>
                </div>
              )}

              {msgsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-3/4" />)
              ) : (
                allMessages.map((msg: Message) => (
                  <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="max-w-[80%] space-y-1">
                      <div
                        dir="rtl"
                        className={cn(
                          'rounded-2xl px-4 py-2.5 text-sm',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground whitespace-pre-wrap shadow-glass-sm'
                            : 'glass-subtle prose-sm'
                        )}
                      >
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 px-1" dir="rtl">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyMessage(msg.id, msg.content)}>
                            {copiedId === msg.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </Button>
                          {streamMeta && msg.id === allMessages[allMessages.length - 1]?.id && (
                            <>
                              {streamMeta.model && (
                                <span className={cn('text-[10px] px-1.5 py-0 rounded', MODE_BADGE[streamMeta.model]?.className)}>
                                  {MODE_BADGE[streamMeta.model]?.label || streamMeta.model}
                                </span>
                              )}
                              {streamMeta.coinCost !== undefined && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Coins className="h-2.5 w-2.5" />
                                  {streamMeta.coinCost}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {streaming && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="max-w-[80%]">
                    {streamText ? (
                      <div dir="rtl" className="rounded-2xl px-4 py-2.5 text-sm glass-subtle prose-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{streamText}</ReactMarkdown>
                        <span className="animate-pulse text-primary">▌</span>
                      </div>
                    ) : (
                      <div className="rounded-2xl px-4 py-3 glass-subtle flex items-center gap-2" dir="rtl">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-muted-foreground">در حال آماده‌سازی پاسخ...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </Card>

        <div className="border-t border-[hsl(var(--glass-border-subtle))] p-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex flex-wrap gap-2 justify-center" dir="rtl">
              {QUICK_PROMPTS.map((q) => (
                <Button
                  key={q.label}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  disabled={streaming}
                  onClick={() => runQuickPrompt(q.text)}
                >
                  {q.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="هدف، سطح، زمان یا سوالت رو بنویس... (مثلاً: می‌خوام لاغر شم، برنامه بده)"
                className="min-h-[48px] max-h-[120px] resize-none text-sm"
                disabled={streaming}
                dir="rtl"
              />
              <Button
                onClick={() => sendMessage(undefined)}
                disabled={!message.trim() || streaming}
                size="icon"
                className="h-[48px] w-[48px] flex-shrink-0"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-muted-foreground flex-wrap" dir="rtl">
              <span>مدل: {MODES.find(m => m.value === mode)?.label}</span>
              <span>•</span>
              <span>سطح: {LEVELS.find(l => l.value === level)?.label}</span>
              <span>•</span>
              <span>هدف: {GOALS.find(g => g.value === goal)?.label}</span>
              {place !== 'none' && <><span>•</span><span>محل: {PLACES.find(p => p.value === place)?.label}</span></>}
              {timePerDay !== 'none' && <><span>•</span><span>زمان: {TIME_OPTIONS.find(t => t.value === timePerDay)?.label}</span></>}
              <span>•</span>
              <span>ایمنی: {safetyMode ? 'محافظه‌کار' : 'عادی'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className={cn(
        'flex flex-col border-l border-[hsl(var(--glass-border-subtle))] glass-heavy transition-all duration-300',
        settingsOpen ? 'w-72 min-w-[18rem]' : 'w-0 min-w-0 overflow-hidden'
      )}>
        <div className="flex items-center gap-2 p-4 border-b border-[hsl(var(--glass-border-subtle))]">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">تنظیمات دستیار</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">سطح تمرین / برنامه</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      <span className="flex items-center gap-2">
                        <span>{l.icon}</span>
                        <span>{l.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">سبک پاسخ</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={cn(
                      'rounded-xl px-3 py-2 text-xs text-right transition-all duration-200',
                      style === s.value
                        ? 'glass shadow-glass-sm border-primary/30 text-primary font-medium'
                        : 'border border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))] text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">حالت مدل (سکه)</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] transition-all duration-200',
                      mode === m.value
                        ? 'glass shadow-glass-sm border-primary/30 text-primary font-medium'
                        : 'border border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))] text-muted-foreground'
                    )}
                  >
                    <m.icon className="h-3.5 w-3.5" />
                    <span>{m.label}</span>
                    <span className="text-[10px] opacity-60">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">هدف از پیش انتخاب‌شده</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="انتخاب هدف..." />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> محل تمرین
              </Label>
              <Select value={place} onValueChange={setPlace}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> زمان در روز
              </Label>
              <Select value={timePerDay} onValueChange={setTimePerDay}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">حالت ایمنی</Label>
              <button
                onClick={() => setSafetyMode(!safetyMode)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl p-3 transition-all duration-200 text-right',
                  safetyMode ? 'glass shadow-glass-sm border-amber-500/30' : 'border border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))]'
                )}
              >
                {safetyMode ? (
                  <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <ShieldOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">
                    {safetyMode ? 'محافظه‌کار' : 'عادی'}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    {safetyMode ? 'توصیه بیشتر مراجعه به پزشک/متخصص در موارد مبهم' : 'پاسخ‌دهی عادی'}
                  </p>
                </div>
              </button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Save className="h-3 w-3" /> پروفایل تنظیمات
              </Label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={profileNameToSave}
                  onChange={(e) => setProfileNameToSave(e.target.value)}
                  placeholder="نام پروفایل"
                  className="flex-1 h-9 rounded-lg border border-[hsl(var(--glass-border-subtle))] bg-[hsl(var(--glass-bg))] px-2.5 text-xs text-right"
                  dir="rtl"
                />
                <Button variant="outline" size="sm" className="h-9 text-xs shrink-0" onClick={saveCurrentProfile}>
                  ذخیره
                </Button>
              </div>
              {savedProfiles.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <p className="text-[10px] text-muted-foreground">بارگذاری:</p>
                  {savedProfiles.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--glass-border-subtle))] px-2 py-1.5">
                      <button
                        type="button"
                        className="flex-1 text-right text-xs truncate hover:text-primary"
                        onClick={() => loadProfile(p)}
                      >
                        {p.name}
                      </button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => deleteProfile(p.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <Button variant="outline" className="w-full h-9 text-xs" onClick={startNewSession} disabled={streaming}>
              <RotateCcw className="h-3.5 w-3.5 me-2" />
              شروع جلسه جدید
            </Button>
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
