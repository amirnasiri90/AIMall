'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, Bot, User, Copy, Check, RotateCcw, ChevronLeft, MessageSquare, LayoutGrid, Bookmark, BarChart3, Settings, BookmarkPlus, Trash2, AlertCircle, Zap, Coins, Gauge, Settings2, PanelLeftClose, PanelLeftOpen, History, Paperclip, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { AgentWorkspace } from './agent-workspaces';
import { getSavedItems, addSavedItem, removeSavedItem, getAgentSettings, setAgentSettings, titleFromContent, getWorkspaceContextForAgent, type SavedItem, type AgentSettings } from './agent-storage';

export interface AgentChatConfig {
  agentId: string;
  titleFa: string;
  descriptionFa: string;
  chipsFa?: string[];
  quickActions: { label: string; text: string }[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  coinCost?: number;
}

/** سطح توضیح (مثل دستیار ورزش/دانش‌آموز) */
const LEVELS = [
  { value: 'simple', label: 'مبتدی', icon: '🟢' },
  { value: 'standard', label: 'متوسط', icon: '🟡' },
  { value: 'advanced', label: 'پیشرفته', icon: '🔴' },
];

/** سبک پاسخ */
const STYLES = [
  { value: 'brief', label: 'کوتاه' },
  { value: 'detailed', label: 'مفصل' },
  { value: 'with_alternatives', label: 'با جایگزین' },
];

/** حالت مدل */
const MODES = [
  { value: 'fast', label: 'سریع', icon: Zap, desc: '۲ سکه' },
  { value: 'eco', label: 'اقتصادی', icon: Coins, desc: '۱ سکه' },
  { value: 'accurate', label: 'دقیق', icon: Gauge, desc: '۴ سکه' },
];

export function AgentChatPage({ config }: { config: AgentChatConfig }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useAuthStore();
  const { agentId, titleFa, descriptionFa, chipsFa = [], quickActions } = config;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamMeta, setStreamMeta] = useState<{ model?: string; coinCost?: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AgentSettings>({});
  const [level, setLevel] = useState('standard');
  const [style, setStyle] = useState('detailed');
  const [mode, setMode] = useState('fast');
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; file: File; preview?: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: agentConversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ['agent-conversations', agentId, currentOrganizationId],
    queryFn: () => api.getAgentConversations(agentId, currentOrganizationId),
  });

  const { data: dbMessages, isLoading: msgsLoading } = useQuery({
    queryKey: ['agent-messages', agentId, conversationId],
    queryFn: () => api.getAgentMessages(agentId, conversationId!),
    enabled: !!conversationId,
  });

  // با عوض شدن دستیار، گفتگوی انتخاب‌شده را پاک کن تا سابقهٔ همان دستیار لود شود
  useEffect(() => {
    setConversationId(null);
    setLocalMessages([]);
    setStreamText('');
    setStreamMeta(null);
  }, [agentId]);

  // اگر سابقهٔ گفتگو لود شد و هنوز گفتگی انتخاب نشده، آخرین گفتگو را انتخاب کن
  useEffect(() => {
    if (convsLoading || conversationId) return;
    if (agentConversations.length > 0) setConversationId(agentConversations[0].id);
  }, [convsLoading, agentConversations, conversationId]);

  const allMessages: Message[] = useMemo(() => {
    if (dbMessages && dbMessages.length > 0) return dbMessages;
    return localMessages;
  }, [dbMessages, localMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, streamText]);

  useEffect(() => {
    const s = getAgentSettings(agentId);
    setSettings(s);
    setSavedItems(getSavedItems(agentId));
    if (s.streamParams) {
      setLevel(s.streamParams.level);
      setStyle(s.streamParams.style);
      setMode(s.streamParams.mode);
    }
  }, [agentId]);

  const startNewSession = useCallback(async () => {
    try {
      const conv = await api.createAgentConversation(agentId, undefined, currentOrganizationId);
      setConversationId(conv.id);
      setLocalMessages([]);
      setStreamText('');
      setStreamMeta(null);
      queryClient.invalidateQueries({ queryKey: ['agent-conversations', agentId] });
      toast.success('جلسه جدید شروع شد');
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [agentId, queryClient, currentOrganizationId]);

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const parseAgentSSE = async (
    res: Response,
    opts: { onDelta: (c: string) => void; onUsage: (u: { model?: string; coinCost?: number }) => void; onDone: () => void; onError: (m: string) => void },
  ) => {
    const reader = res.body?.getReader();
    if (!reader) {
      opts.onError('بدون پاسخ');
      return;
    }
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(trimmed.slice(6));
            if (d.type === 'delta') opts.onDelta(d.content ?? '');
            else if (d.type === 'usage') opts.onUsage(d);
            else if (d.type === 'done') {
              opts.onDone();
              return;
            } else if (d.type === 'error') {
              opts.onError(d.message || 'خطا');
              return;
            }
          } catch {}
        }
      }
      opts.onDone();
    } catch {
      opts.onError('خطا در خواندن پاسخ');
    }
  };

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? message).trim();
    const hasAttachments = attachedFiles.length > 0;
    if ((!text && !hasAttachments) || streaming) return;

    let convId = conversationId;
    if (!convId) {
      try {
        const conv = await api.createAgentConversation(agentId, undefined, currentOrganizationId);
        convId = conv.id;
        setConversationId(conv.id);
        queryClient.invalidateQueries({ queryKey: ['agent-conversations', agentId] });
      } catch (err: any) {
        toast.error(err.message);
        return;
      }
    }

    if (!overrideText) setMessage('');
    setStreaming(true);
    setStreamText('');
    setStreamMeta(null);
    setStreamError(null);

    const displayText = text || (hasAttachments ? '[فایل‌های پیوست شده]' : '');
    const userMsg: Message = { id: `tmp-${Date.now()}`, role: 'user', content: displayText };
    setLocalMessages((prev) => [...prev, userMsg]);

    const ws = getWorkspaceContextForAgent(agentId);
    const pre: string[] = [];
    if (settings.tone) pre.push('لحن ترجیحی کاربر: ' + settings.tone);
    if (settings.language) pre.push('زبان ترجیحی: ' + settings.language);
    const workspaceContext = pre.length ? pre.join('. ') + (ws ? '\n' + ws : '') : ws;

    if (hasAttachments) {
      try {
        const attachments = await Promise.all(
          attachedFiles.map(async (a) => ({
            type: a.file.type.startsWith('image/') ? 'image' : (a.file.name?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'),
            data: await readFileAsBase64(a.file),
            name: a.file.name,
          })),
        );
        setAttachedFiles([]);
        const res = await api.agentStreamPost(agentId, {
          conversationId: convId!,
          message: text,
          level,
          style,
          mode,
          integrityMode: false,
          workspaceContext: workspaceContext || undefined,
          attachments,
        });
        await parseAgentSSE(res, {
          onDelta: (c) => setStreamText((prev) => prev + c),
          onUsage: (u) => setStreamMeta({ model: u.model, coinCost: u.coinCost }),
          onDone: () => {
            setStreaming(false);
            setStreamText('');
            queryClient.invalidateQueries({ queryKey: ['agent-messages', agentId, convId] });
          },
          onError: (m) => {
            toast.error(m);
            setStreaming(false);
          },
        });
      } catch (err: any) {
        toast.error(err.message || 'خطا در ارسال');
        setStreaming(false);
      }
      return;
    }

    try {
      const url = api.agentStreamUrl(agentId, convId!, text, {
        level,
        style,
        mode,
        integrityMode: false,
        workspaceContext: workspaceContext || undefined,
      });
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'delta') setStreamText((prev) => prev + (data.content || ''));
          else if (data.type === 'usage') setStreamMeta({ model: data.model, coinCost: data.coinCost });
          else if (data.type === 'done') {
            eventSource.close();
            setStreaming(false);
            setStreamText('');
            queryClient.invalidateQueries({ queryKey: ['agent-messages', agentId, convId] });
          } else if (data.type === 'error') {
            const errMsg = data.message || 'خطا';
            setStreamError(errMsg);
            toast.error(errMsg);
            eventSource.close();
            setStreaming(false);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        eventSource.close();
        setStreaming(false);
        const errMsg = 'خطا در ارتباط با سرور';
        setStreamError(errMsg);
        toast.error(errMsg);
      };
    } catch (err: any) {
      toast.error(err.message);
      setStreaming(false);
    }
  }, [agentId, conversationId, message, streaming, currentOrganizationId, queryClient, level, style, mode, settings, attachedFiles]);

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

  const saveMessage = (content: string) => {
    addSavedItem(agentId, { title: titleFromContent(content), content });
    setSavedItems(getSavedItems(agentId));
    toast.success('به ذخیره‌شده‌ها اضافه شد');
  };

  const deleteSaved = (id: string) => {
    removeSavedItem(agentId, id);
    setSavedItems(getSavedItems(agentId));
    toast.success('حذف شد');
  };

  const updateSetting = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setAgentSettings(agentId, next);
    toast.success('تنظیم ذخیره شد');
  };

  const updateStreamParam = (key: 'level' | 'style' | 'mode', value: string) => {
    if (key === 'level') setLevel(value);
    else if (key === 'style') setStyle(value);
    else setMode(value);
    const streamParams = { level: key === 'level' ? value : level, style: key === 'style' ? value : style, mode: key === 'mode' ? value : mode };
    const next = { ...settings, streamParams };
    setSettings(next);
    setAgentSettings(agentId, next);
    toast.success('تنظیم مدل ذخیره شد');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-0" dir="rtl">
      <div className="flex items-center justify-between gap-2 mb-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/agents')} aria-label="بازگشت به لیست دستیارها">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{titleFa}</h1>
          <p className="text-sm text-muted-foreground truncate">{descriptionFa}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSettingsPanelOpen((o) => !o)} aria-label={settingsPanelOpen ? 'بستن پنل تنظیمات' : 'باز کردن پنل تنظیمات'} className="gap-1.5">
          {settingsPanelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          <span className="hidden sm:inline">تنظیمات دستیار</span>
        </Button>
        <Button variant="outline" size="sm" onClick={startNewSession} aria-label="شروع جلسه جدید">
          <RotateCcw className="h-3.5 w-3.5 me-1" aria-hidden />
          جلسه جدید
        </Button>
      </div>

      <Tabs defaultValue="chat" className="flex-1 min-h-0 flex flex-col" dir="rtl">
        <TabsList className="w-fit justify-start gap-0.5 mb-3 flex-shrink-0 p-1 h-auto" aria-label="تب‌های دستیار">
          <TabsTrigger value="chat" className="size-9 p-0 rounded-md" aria-label="چت"><MessageSquare className="h-4 w-4 shrink-0" aria-hidden /></TabsTrigger>
          <TabsTrigger value="workspace" className="size-9 p-0 rounded-md" aria-label="فضای کار"><LayoutGrid className="h-4 w-4 shrink-0" aria-hidden /></TabsTrigger>
          <TabsTrigger value="saved" className="size-9 p-0 rounded-md" aria-label="ذخیره‌شده"><Bookmark className="h-4 w-4 shrink-0" aria-hidden /></TabsTrigger>
          <TabsTrigger value="insights" className="size-9 p-0 rounded-md" aria-label="بینش‌ها"><BarChart3 className="h-4 w-4 shrink-0" aria-hidden /></TabsTrigger>
          <TabsTrigger value="settings" className="size-9 p-0 rounded-md" aria-label="تنظیمات"><Settings className="h-4 w-4 shrink-0" aria-hidden /></TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 min-h-0 flex flex-col mt-0 data-[state=inactive]:hidden">
          <div className="flex flex-1 min-h-0 gap-0 overflow-hidden relative">
            {/* پنل تنظیمات: موبایل = تمام‌صفحه روی چت، دسکتاپ = کنار چت */}
            <div
              className={cn(
                'flex flex-col border-border bg-muted/20 transition-all duration-300 overflow-hidden',
                settingsPanelOpen
                  ? 'fixed inset-0 z-50 bg-background md:relative md:inset-auto md:z-auto md:w-72 md:min-w-[18rem] md:shrink-0 md:border-l'
                  : 'w-0 min-w-0 shrink-0 hidden md:flex'
              )}
              aria-hidden={!settingsPanelOpen}
            >
              <div className="flex items-center justify-between gap-2 p-3 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold">تنظیمات دستیار</span>
                </div>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setSettingsPanelOpen(false)} aria-label="بستن تنظیمات">
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">سطح توضیح</Label>
                    <Select value={level} onValueChange={(v) => updateStreamParam('level', v)}>
                      <SelectTrigger className="h-9 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            <span className="flex items-center gap-2"><span>{l.icon}</span><span>{l.label}</span></span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">سبک پاسخ</Label>
                    <div className="grid grid-cols-1 gap-1.5 mt-1">
                      {STYLES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => updateStreamParam('style', s.value)}
                          className={cn(
                            'rounded-lg px-3 py-2 text-xs text-right transition-all w-full',
                            style === s.value ? 'bg-primary/10 text-primary font-medium border border-primary/30' : 'border border-border hover:bg-muted/50 text-muted-foreground'
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">حالت مدل</Label>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {MODES.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => updateStreamParam('mode', m.value)}
                          className={cn(
                            'flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-2 text-[11px] transition-all',
                            mode === m.value ? 'bg-primary/10 text-primary font-medium border border-primary/30' : 'border border-border hover:bg-muted/50 text-muted-foreground'
                          )}
                        >
                          <m.icon className="h-3.5 w-3.5" aria-hidden />
                          <span>{m.label}</span>
                          <span className="opacity-70">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full h-9 text-xs" onClick={startNewSession} disabled={streaming}>
                    <RotateCcw className="h-3.5 w-3.5 me-2" />
                    شروع جلسه جدید
                  </Button>
                </div>
              </ScrollArea>
            </div>

            {/* ناحیه چت */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <History className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <Select
                  value={conversationId ?? '__new__'}
                  onValueChange={(v) => {
                    if (v === '__new__') startNewSession();
                    else setConversationId(v);
                  }}
                  disabled={streaming}
                >
                  <SelectTrigger className="h-9 max-w-[16rem] text-xs" aria-label="انتخاب گفتگو">
                    <SelectValue placeholder="سابقه گفتگو" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">گفتگوی جدید</SelectItem>
                    {agentConversations.map((c: { id: string; title?: string | null }) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="truncate block max-w-[12rem]" title={c.title ?? undefined}>{c.title || 'بدون عنوان'}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {chipsFa.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
                  {chipsFa.map((chip) => (
                    <span key={chip} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{chip}</span>
                  ))}
                </div>
              )}
              {quickActions.length > 0 && (
                <div className="mb-3 flex-shrink-0 rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">پرامت‌های آماده</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickActions.map((qa) => (
                      <button
                        key={qa.label}
                        type="button"
                        onClick={() => sendMessage(qa.text)}
                        disabled={streaming}
                        className="text-xs px-2.5 py-1.5 rounded-md bg-background border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors disabled:opacity-50 text-right"
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {streamError && (
                <div className="flex items-center justify-between gap-2 mb-3 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm" role="alert">
                  <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {streamError}</span>
                  <Button variant="outline" size="sm" onClick={() => { setStreamError(null); textareaRef.current?.focus(); }}>تلاش دوباره</Button>
                </div>
              )}
              <Card className="flex-1 min-h-0 flex flex-col overflow-hidden" dir="rtl">
                <ScrollArea className="flex-1 p-4" role="log" aria-live="polite" aria-label="لیست پیام‌های چت">
                  {msgsLoading && !allMessages.length ? (
                    <div className="flex items-center justify-center py-12">
                      <Skeleton className="h-24 w-full max-w-md rounded-lg" />
                    </div>
                  ) : !allMessages.length && !streamText ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                      <Bot className="h-12 w-12 opacity-30 mb-3" />
                      <p className="text-sm">هنوز پیامی نفرستادی — یکی از پیشنهادها را بزن یا خودت بنویس (دقیق و بازیگوش).</p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-right">
                      {allMessages.map((m) => (
                        <div key={m.id} className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className={cn('flex-1 min-w-0 rounded-lg p-3 text-sm text-right', m.role === 'user' ? 'bg-primary/10' : 'bg-muted/50')}>
                            {m.role === 'assistant' ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-right prose-ul:list-inside prose-ol:list-inside prose-li:text-right" dir="rtl">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{m.content}</p>
                            )}
                            {m.role === 'assistant' && (
                              <div className="flex gap-1 mt-2" role="group" aria-label="عملیات پیام">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyMessage(m.id, m.content)} aria-label={copiedId === m.id ? 'کپی شد' : 'کپی این پاسخ'}>
                                  {copiedId === m.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveMessage(m.content)} aria-label="ذخیره این پاسخ">
                                  <BookmarkPlus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {streamText && (
                        <div className="flex gap-3 flex-row-reverse text-right">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Bot className="h-4 w-4" /></div>
                          <div className="flex-1 min-w-0 rounded-lg p-3 text-sm bg-muted/50 text-right">
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-right prose-ul:list-inside prose-ol:list-inside prose-li:text-right" dir="rtl">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamText}</ReactMarkdown>
                            </div>
                            {streaming && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>
                {attachedFiles.length > 0 && (
                  <div className="px-3 pt-2 flex flex-wrap gap-2 flex-row-reverse border-t border-border/50">
                    {attachedFiles.map((a) => (
                      <div key={a.id} className="flex items-center gap-1.5 text-xs flex-row-reverse">
                        {a.preview ? (
                          <img src={a.preview} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="truncate max-w-[120px]">{a.file.name}</span>
                        <button type="button" onClick={() => setAttachedFiles((prev) => prev.filter((x) => x.id !== a.id))} className="p-0.5 rounded hover:bg-muted" aria-label="حذف پیوست">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3 border-t flex gap-2 flex-shrink-0 flex-row-reverse">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files?.length) return;
                      const next = Array.from(files).map((file) => {
                        const id = Math.random().toString(36).slice(2);
                        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
                        return { id, file, preview };
                      });
                      setAttachedFiles((prev) => [...prev, ...next]);
                      e.target.value = '';
                    }}
                  />
                  {!streaming && (
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 h-[80px] w-12" onClick={() => fileInputRef.current?.click()} title="پیوست فایل (تصویر یا PDF)" aria-label="پیوست فایل">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  )}
                  <Textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="پیام خود را بنویسید..." className="min-h-[80px] resize-none text-right flex-1" dir="rtl" disabled={streaming} aria-label="متن پیام" />
                  <Button onClick={() => sendMessage()} disabled={streaming || (!message.trim() && attachedFiles.length === 0)} size="icon" className="shrink-0 h-[80px] w-12" aria-label={streaming ? 'در حال ارسال' : 'ارسال پیام'}>
                    {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </Card>
              {streamMeta?.coinCost != null && <p className="text-xs text-muted-foreground mt-2">مصرف: {streamMeta.coinCost} سکه</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workspace" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-2">
              <AgentWorkspace agentId={agentId} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="saved" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-auto" role="tabpanel" aria-label="ذخیره‌شده‌ها">
          <div className="p-4 space-y-3">
            {savedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Bookmark className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm">هنوز چیزی ذخیره نکرده‌اید. در تب چت روی «ذخیره این پاسخ» کنار هر پاسخ دستیار بزنید.</p>
              </div>
            ) : (
              <ul className="space-y-2" role="list">
                {savedItems.map((item) => (
                  <li key={item.id} className="rounded-lg border bg-card p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.createdAt).toLocaleDateString('fa-IR')}</p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">مشاهده متن</summary>
                          <div className="mt-2 p-2 rounded bg-muted/50 prose prose-sm max-w-none dark:prose-invert max-h-48 overflow-y-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                          </div>
                        </details>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(item.content); toast.success('کپی شد'); }} aria-label="کپی">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSaved(item.id)} aria-label="حذف">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-auto" role="tabpanel" aria-label="بینش‌ها">
          <div className="p-4 space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3">آمار این دستیار</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">تعداد ذخیره‌شده‌ها</dt>
                  <dd className="font-medium mt-0.5">{savedItems.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">آخرین ذخیره</dt>
                  <dd className="font-medium mt-0.5">
                    {savedItems.length > 0
                      ? new Date(savedItems[0].createdAt).toLocaleDateString('fa-IR', { dateStyle: 'short' })
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">پیام‌های این جلسه</dt>
                  <dd className="font-medium mt-0.5">{allMessages.length}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-auto" role="tabpanel" aria-label="تنظیمات">
          <div className="p-4 max-w-md space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3">تنظیمات مدل (سطح، سبک، سرعت)</h3>
              <p className="text-xs text-muted-foreground mb-4">مثل دستیار دانش‌آموز و ورزش؛ روی پاسخ‌های چت اثر می‌گذارد.</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">سطح توضیح</Label>
                  <Select value={level} onValueChange={(v) => updateStreamParam('level', v)}>
                    <SelectTrigger className="h-9 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          <span className="flex items-center gap-2"><span>{l.icon}</span><span>{l.label}</span></span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">سبک پاسخ</Label>
                  <div className="grid grid-cols-1 gap-1.5 mt-1">
                    {STYLES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => updateStreamParam('style', s.value)}
                        className={cn(
                          'rounded-lg px-3 py-2 text-xs text-right transition-all',
                          style === s.value ? 'bg-primary/10 text-primary font-medium border border-primary/30' : 'border border-border hover:bg-muted/50 text-muted-foreground'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">حالت مدل</Label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {MODES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => updateStreamParam('mode', m.value)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-[11px] transition-all',
                          mode === m.value ? 'bg-primary/10 text-primary font-medium border border-primary/30' : 'border border-border hover:bg-muted/50 text-muted-foreground'
                        )}
                      >
                        <m.icon className="h-3.5 w-3.5" aria-hidden />
                        <span>{m.label}</span>
                        <span className="opacity-70">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3">ترجیحات نمایش</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="agent-tone" className="text-xs">لحن پاسخ‌ها</Label>
                  <Input id="agent-tone" value={settings.tone ?? ''} onChange={(e) => updateSetting('tone', e.target.value || undefined)} placeholder="مثلاً دوستانه، رسمی" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="agent-lang" className="text-xs">زبان ترجیحی</Label>
                  <Input id="agent-lang" value={settings.language ?? ''} onChange={(e) => updateSetting('language', e.target.value || undefined)} placeholder="فارسی / English" className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="agent-notify" checked={settings.notifyOnSave ?? false} onChange={(e) => updateSetting('notifyOnSave', e.target.checked)} className="rounded" />
                  <Label htmlFor="agent-notify">اعلان هنگام ذخیره پاسخ</Label>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
