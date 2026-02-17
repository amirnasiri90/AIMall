'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  GraduationCap, Send, Loader2, Bot, User, Copy, Check,
  RotateCcw, Settings2, Zap, Coins, ShieldCheck, ShieldOff,
  ChevronLeft, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

const LEVELS = [
  { value: 'simple', label: 'خیلی ساده', icon: '🟢' },
  { value: 'standard', label: 'استاندارد', icon: '🟡' },
  { value: 'advanced', label: 'پیشرفته', icon: '🔴' },
];

const STYLES = [
  { value: 'hint_only', label: 'فقط راهنمایی' },
  { value: 'full_solution', label: 'حل کامل' },
  { value: 'formula_only', label: 'فقط نکته و فرمول' },
];

const MODES = [
  { value: 'fast', label: 'سریع', icon: Zap, desc: '2 سکه', badge: 'Fast' },
  { value: 'eco', label: 'اقتصادی', icon: Coins, desc: '1 سکه', badge: 'Eco' },
  { value: 'accurate', label: 'دقیق', icon: GraduationCap, desc: '4 سکه', badge: 'Acc' },
];

const SUBJECTS = [
  { value: 'none', label: 'عمومی (بدون فیلتر)' },
  { value: 'ریاضی', label: 'ریاضی' },
  { value: 'فیزیک', label: 'فیزیک' },
  { value: 'شیمی', label: 'شیمی' },
  { value: 'زیست', label: 'زیست‌شناسی' },
  { value: 'ادبیات', label: 'ادبیات' },
  { value: 'عمومی', label: 'عمومی' },
];

const MODE_BADGE: Record<string, { label: string; className: string }> = {
  fast: { label: 'Fast', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  eco: { label: 'Eco', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  accurate: { label: 'Accurate', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  coinCost?: number;
}

export default function StudentTutorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useAuthStore();

  // Settings
  const [level, setLevel] = useState('standard');
  const [style, setStyle] = useState('full_solution');
  const [mode, setMode] = useState('fast');
  const [subject, setSubject] = useState('none');
  const [integrityMode, setIntegrityMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Chat state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamMeta, setStreamMeta] = useState<{ model?: string; coinCost?: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const AGENT_ID = 'student-tutor';

  // Fetch messages when we have a conversation
  const { data: dbMessages, isLoading: msgsLoading } = useQuery({
    queryKey: ['agent-messages', AGENT_ID, conversationId],
    queryFn: () => api.getAgentMessages(AGENT_ID, conversationId!),
    enabled: !!conversationId,
  });

  // Merge db messages with local
  const allMessages: Message[] = useMemo(() => {
    if (dbMessages && dbMessages.length > 0) return dbMessages;
    return localMessages;
  }, [dbMessages, localMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, streamText]);

  const startNewSession = useCallback(async () => {
    try {
      const conv = await api.createAgentConversation(AGENT_ID, undefined, currentOrganizationId);
      setConversationId(conv.id);
      setLocalMessages([]);
      setStreamText('');
      setStreamMeta(null);
      queryClient.invalidateQueries({ queryKey: ['agent-conversations', AGENT_ID] });
      toast.success('جلسه جدید شروع شد');
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [queryClient, currentOrganizationId]);

  const sendMessage = async () => {
    if (!message.trim() || streaming) return;

    // Auto-create agent conversation if none exists
    let convId = conversationId;
    if (!convId) {
      try {
        const conv = await api.createAgentConversation(AGENT_ID, undefined, currentOrganizationId);
        convId = conv.id;
        setConversationId(conv.id);
        queryClient.invalidateQueries({ queryKey: ['agent-conversations', AGENT_ID] });
      } catch (err: any) {
        toast.error(err.message);
        return;
      }
    }

    const msg = message;
    setMessage('');
    setStreaming(true);
    setStreamText('');
    setStreamMeta(null);

    // Add user message locally for instant feedback
    const userMsg: Message = { id: `tmp-${Date.now()}`, role: 'user', content: msg };
    setLocalMessages((prev) => [...prev, userMsg]);

    try {
      const url = api.agentStreamUrl('student-tutor', convId!, msg, {
        level,
        style,
        mode,
        subject: subject !== 'none' ? subject : undefined,
        integrityMode,
      });

      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'delta') {
            setStreamText((prev) => prev + data.content);
          } else if (data.type === 'usage') {
            setStreamMeta({ model: data.model, coinCost: data.coinCost });
          } else if (data.type === 'done') {
            eventSource.close();
            setStreaming(false);
            setStreamText('');
            queryClient.invalidateQueries({ queryKey: ['agent-messages', AGENT_ID, convId] });
          } else if (data.type === 'error') {
            toast.error(data.message || 'خطا');
            eventSource.close();
            setStreaming(false);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        eventSource.close();
        setStreaming(false);
        toast.error('خطا در ارتباط با سرور');
      };
    } catch (err: any) {
      toast.error(err.message);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markdownComponents = useMemo(() => ({
    p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li>{children}</li>,
    code: ({ inline, children }: any) =>
      inline
        ? <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
        : <pre className="bg-black/10 dark:bg-white/10 rounded p-3 my-2 overflow-x-auto text-xs font-mono"><code>{children}</code></pre>,
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-bold mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
    a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
    blockquote: ({ children }: any) => <blockquote className="border-r-2 border-primary/50 pr-3 my-2 italic text-muted-foreground">{children}</blockquote>,
    table: ({ children }: any) => <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border-collapse">{children}</table></div>,
    th: ({ children }: any) => <th className="border border-border px-2 py-1 bg-muted font-medium text-right">{children}</th>,
    td: ({ children }: any) => <td className="border border-border px-2 py-1 text-right">{children}</td>,
  }), []);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 overflow-hidden rounded-2xl glass glass-shine">
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
            {/* Level */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">سطح توضیح</Label>
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

            {/* Style */}
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

            {/* Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">حالت مدل</Label>
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

            {/* Subject */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">درس (اختیاری)</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="انتخاب درس..." />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Integrity Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">حالت صداقت علمی</Label>
              <button
                onClick={() => setIntegrityMode(!integrityMode)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl p-3 transition-all duration-200 text-right',
                  integrityMode
                    ? 'glass shadow-glass-sm border-amber-500/30'
                    : 'border border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))]'
                )}
              >
                {integrityMode ? (
                  <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <ShieldOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">
                    {integrityMode ? 'فعال' : 'غیرفعال'}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    {integrityMode ? 'بدون لو دادن جواب — راهنمایی تدریجی' : 'جواب مستقیم طبق سبک انتخابی'}
                  </p>
                </div>
              </button>
            </div>

            <Separator />

            {/* New Session */}
            <Button
              variant="outline"
              className="w-full h-9 text-xs"
              onClick={startNewSession}
              disabled={streaming}
            >
              <RotateCcw className="h-3.5 w-3.5 me-2" />
              شروع جلسه جدید
            </Button>
          </div>
        </ScrollArea>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
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
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-none">دستیار دانش‌آموز</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Student Tutor Agent</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push('/agents')}>
            <ChevronLeft className="h-3.5 w-3.5 me-1" />
            بازگشت
          </Button>
        </div>

        {/* Messages */}
        <Card className="flex-1 overflow-hidden border-0 rounded-none shadow-none !bg-transparent !backdrop-blur-none [&::before]:hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 max-w-3xl mx-auto" dir="ltr">
              {/* Empty state */}
              {allMessages.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl glass-subtle flex items-center justify-center mb-4">
                    <GraduationCap className="h-8 w-8 text-primary/40" />
                  </div>
                  <h3 className="text-base font-medium mb-1" dir="rtl">سلام! سوالت رو بپرس 👋</h3>
                  <p className="text-xs text-center max-w-sm" dir="rtl">
                    هر سوال درسی داری بنویس — ریاضی، فیزیک، شیمی، زیست یا ادبیات. کمکت می‌کنم یاد بگیری!
                  </p>
                </div>
              )}

              {msgsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-3/4" />)
              ) : (
                allMessages.map((msg: any) => (
                  <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-4 w-4 text-primary" />
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
                      {/* Footer for assistant messages */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 px-1" dir="rtl">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyMessage(msg.id, msg.content)}
                          >
                            {copiedId === msg.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                          {streamMeta && msg.id === allMessages[allMessages.length - 1]?.id && streamMeta.model && (
                            <>
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', MODE_BADGE[streamMeta.model]?.className)}>
                                {MODE_BADGE[streamMeta.model]?.label || streamMeta.model}
                              </Badge>
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

              {/* Streaming message */}
              {streaming && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-primary" />
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
                        <span className="text-xs text-muted-foreground">در حال فکر کردن...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </Card>

        {/* Input */}
        <div className="border-t border-[hsl(var(--glass-border-subtle))] p-4">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="سوال درسیت رو اینجا بنویس..."
              className="min-h-[48px] max-h-[120px] resize-none text-sm"
              disabled={streaming}
              dir="rtl"
            />
            <Button
              onClick={sendMessage}
              disabled={!message.trim() || streaming}
              size="icon"
              className="h-[48px] w-[48px] flex-shrink-0"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground max-w-3xl mx-auto" dir="rtl">
            <span>مدل: {MODES.find(m => m.value === mode)?.label}</span>
            <span>•</span>
            <span>سطح: {LEVELS.find(l => l.value === level)?.label}</span>
            <span>•</span>
            <span>صداقت: {integrityMode ? 'فعال' : 'غیرفعال'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
