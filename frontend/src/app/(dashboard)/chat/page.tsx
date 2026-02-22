'use client';
import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Plus, Send, Trash2, MessageSquare, Bot, User, Coins,
  Copy, Check, Square, RefreshCw, Pin, PinOff, Archive, ArchiveRestore,
  Search, Settings2, Download, Pencil, MoreHorizontal, GitCompareArrows,
  ChevronRight, FileText, Brain, Loader2, X, Sparkles, Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { cn, formatTime } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

/* ── Lazy-load heavy syntax highlighter ── */
const LazyHighlighter = lazy(() =>
  import('react-syntax-highlighter').then(mod => ({ default: mod.Prism }))
);
const lazyThemePromise = import('react-syntax-highlighter/dist/esm/styles/prism').then(m => m.oneDark);
let cachedTheme: any = null;
lazyThemePromise.then(t => { cachedTheme = t; });

/** نمایش نام مدل بدون پسوند ارائه‌دهنده مثل (OpenRouter) */
function modelDisplayName(name: string): string {
  if (!name) return name;
  return name.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*（[^）]*）\s*$/, '').trim() || name;
}

function CodeBlock({ lang, code, onCopy }: { lang: string; code: string; onCopy: (c: string) => void }) {
  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-[hsl(var(--glass-border-subtle))]">
      <div className="flex items-center justify-between glass-subtle px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{lang || 'code'}</span>
        <button
          onClick={() => onCopy(code)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Copy className="h-3 w-3" /> کپی
        </button>
      </div>
      <Suspense fallback={<pre className="p-3 text-xs font-mono bg-zinc-900 text-zinc-100 overflow-x-auto">{code}</pre>}>
        <LazyHighlighter
          language={lang || 'text'}
          style={cachedTheme || undefined}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.75rem' }}
        >
          {code}
        </LazyHighlighter>
      </Suspense>
    </div>
  );
}

/* ══════════════════════════════════════════ */
export default function ChatPage() {
  /* ── State ── */
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [chatMode, setChatMode] = useState<'fast' | 'economy' | 'accurate'>('economy');
  const [advancedMode, setAdvancedMode] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('aimall_chat_advanced') === 'true'));
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [streaming, setStreaming] = useState(false);
  const [estimatedCoins, setEstimatedCoins] = useState<number | null>(null);
  const [streamText, setStreamText] = useState('');
  const [lastUsage, setLastUsage] = useState<{ coinCost?: number; model?: string } | null>(null);
  const [showList, setShowList] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);
  const [systemPromptValue, setSystemPromptValue] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareModel, setCompareModel] = useState('anthropic/claude-3-haiku');
  const [compareStreaming, setCompareStreaming] = useState(false);
  const [compareStreamText, setCompareStreamText] = useState('');
  const [compareUsage, setCompareUsage] = useState<{ coinCost?: number; model?: string } | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [editingMemory, setEditingMemory] = useState<{ id: string; content: string } | null>(null);
  const [regenerateStyle, setRegenerateStyle] = useState<'different' | 'accurate' | 'creative' | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; file: File; preview?: string }[]>([]);
  const [filterByModel, setFilterByModel] = useState<string>('all');
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const compareEventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, currentOrganizationId } = useAuthStore();

  /* ── خواندن conv از URL در بار اول؛ بعد از آن هر بار activeConv عوض شد URL را به‌روز کن تا رفرش همان چت باز بماند ── */
  const appliedUrlRef = useRef(false);
  useEffect(() => {
    if (appliedUrlRef.current) return;
    const q = searchParams.get('q');
    const convId = searchParams.get('conv');
    if (q) setMessage(decodeURIComponent(q));
    if (convId) {
      setActiveConv(convId);
      setShowList(false);
    }
    if (q || convId) appliedUrlRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return;
    const params = new URLSearchParams(window.location.search);
    const prevConv = params.get('conv');
    if (activeConv) params.set('conv', activeConv);
    else params.delete('conv');
    const newSearch = params.toString() ? `?${params.toString()}` : '';
    if (newSearch !== window.location.search) {
      router.replace(pathname + newSearch, { scroll: false });
    }
  }, [activeConv, pathname, router]);

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const parseSSEStream = useCallback(async (
    res: Response,
    opts: { onDelta: (c: string) => void; onUsage: (u: any) => void; onDone: () => void; onError: (m: string) => void; onCompressed?: () => void; onMemorySuggestion?: (content: string) => void },
  ) => {
    const reader = res.body?.getReader();
    if (!reader) { opts.onError('بدون پاسخ'); return; }
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
          const jsonStr = trimmed.slice(6);
          try {
            const d = JSON.parse(jsonStr);
            if (d.type === 'delta') opts.onDelta(d.content ?? '');
            else if (d.type === 'usage') opts.onUsage(d);
            else if (d.type === 'done') { opts.onDone(); return; }
            else if (d.type === 'error') { opts.onError(d.message || 'خطا'); return; }
            else if (d.type === 'compressed' && opts.onCompressed) opts.onCompressed();
            else if (d.type === 'memory_suggestion' && d.content && opts.onMemorySuggestion) opts.onMemorySuggestion(d.content);
          } catch { /* skip */ }
        }
      }
      opts.onDone();
    } catch (e) {
      opts.onError('خطا در خواندن پاسخ');
    }
  }, []);

  /* ── Cost estimate (debounced) ── */
  useEffect(() => {
    if (!message.trim()) { setEstimatedCoins(null); return; }
    const t = setTimeout(() => {
      api.estimateChat(message.trim(), advancedMode ? undefined : chatMode, advancedMode ? model : undefined, activeConv || undefined)
        .then((r) => setEstimatedCoins(r.estimatedCoins))
        .catch(() => setEstimatedCoins(null));
    }, 400);
    return () => clearTimeout(t);
  }, [message, chatMode, model, advancedMode, activeConv]);

  /* ── Persist advanced mode ── */
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('aimall_chat_advanced', advancedMode ? 'true' : 'false');
  }, [advancedMode]);

  /* ── Queries ── */
  const { data: conversations, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations', searchQuery, showArchived, currentOrganizationId],
    queryFn: () => api.getConversations({ search: searchQuery || undefined, archived: showArchived, organizationId: currentOrganizationId }),
  });
  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', activeConv],
    queryFn: () => api.getMessages(activeConv!),
    enabled: !!activeConv,
  });
  const { data: models } = useQuery({ queryKey: ['models', 'chat'], queryFn: () => api.getModels('chat') });
  const { data: memories, refetch: refetchMemories } = useQuery({
    queryKey: ['memories', activeConv],
    queryFn: () => api.getMemories(activeConv!),
    enabled: !!activeConv && memoryOpen,
  });

  const activeConvData = conversations?.find((c: any) => c.id === activeConv);

  /* مدل‌های یکتا در گفتگوها برای فیلتر */
  const uniqueModels = useMemo(() => {
    const set = new Set<string>();
    conversations?.forEach((c: any) => { if (c.model) set.add(c.model); });
    return Array.from(set).sort();
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (filterByModel === 'all') return conversations;
    return conversations.filter((c: any) => c.model === filterByModel);
  }, [conversations, filterByModel]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText, compareStreamText]);

  /* ── Conversation CRUD ── */
  const createConversation = async () => {
    try {
      const conv = await api.createConversation(undefined, currentOrganizationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConv(conv.id);
      setShowList(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeConv === id) setActiveConv(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const togglePin = async (id: string) => {
    try {
      await api.togglePinConversation(id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleArchive = async (id: string) => {
    try {
      await api.toggleArchiveConversation(id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeConv === id) setActiveConv(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const saveTitle = async (id: string) => {
    if (!editTitleValue.trim()) { setEditingTitle(null); return; }
    try {
      await api.updateConversationTitle(id, editTitleValue.trim());
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) { toast.error(err.message); }
    setEditingTitle(null);
  };

  /* ── Streaming ── */
  const stopGeneration = useCallback(() => {
    eventSourceRef.current?.close(); eventSourceRef.current = null;
    compareEventSourceRef.current?.close(); compareEventSourceRef.current = null;
    setStreaming(false);
    setCompareStreaming(false);
    if (streamText || compareStreamText) {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConv] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
    setStreamText('');
    setCompareStreamText('');
  }, [activeConv, streamText, compareStreamText, queryClient]);

  const startStream = useCallback((url: string, opts: {
    onDelta: (c: string) => void;
    onUsage: (u: any) => void;
    onDone: () => void;
    onError: (m: string) => void;
    onCompressed?: () => void;
    onMemorySuggestion?: (content: string) => void;
    refSetter: (es: EventSource | null) => void;
  }) => {
    const es = new EventSource(url);
    opts.refSetter(es);
    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.type === 'delta') opts.onDelta(d.content ?? '');
        else if (d.type === 'usage') opts.onUsage(d);
        else if (d.type === 'done') { es.close(); opts.refSetter(null); opts.onDone(); }
        else if (d.type === 'error') { toast.error(d.message || 'خطا'); es.close(); opts.refSetter(null); opts.onDone(); }
        else if (d.type === 'compressed' && opts.onCompressed) opts.onCompressed();
        else if (d.type === 'memory_suggestion' && d.content && opts.onMemorySuggestion) opts.onMemorySuggestion(d.content);
      } catch {}
    };
    es.onerror = () => { es.close(); opts.refSetter(null); opts.onError('خطا در ارتباط'); };
  }, []);

  const sendMessage = async (regenerate = false, style?: 'different' | 'accurate' | 'creative') => {
    const hasAttachments = attachedFiles.length > 0;
    if ((!message.trim() && !regenerate && !hasAttachments) || !activeConv || streaming) return;
    const msg = regenerate ? (messages?.at(-2)?.content || message) : message;
    if (!regenerate) {
      setMessage('');
      setOptimisticUserMessage(msg || (hasAttachments ? '[فایل پیوست شده]' : ''));
    }
    setStreaming(true);
    setStreamText('');
    setLastUsage(null);
    setCompareStreamText('');
    setCompareUsage(null);
    setCompareStreaming(false);
    if (style) setRegenerateStyle(style);

    const streamOpts = {
      model: advancedMode ? model : undefined,
      mode: advancedMode ? undefined : chatMode,
      regenerate,
      regenerateStyle: regenerate ? ((style ?? regenerateStyle) || 'different') : undefined,
    };

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
        const res = await api.chatStreamPost({
          conversationId: activeConv,
          message: msg,
          ...streamOpts,
          attachments,
        });
        await parseSSEStream(res, {
          onDelta: (c) => setStreamText((p) => p + c),
          onUsage: (u) => setLastUsage({ coinCost: u.coinCost, model: u.model }),
          onDone: () => {
            setOptimisticUserMessage(null);
            setStreaming(false);
            setStreamText('');
            setRegenerateStyle(null);
            queryClient.invalidateQueries({ queryKey: ['messages', activeConv] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          },
          onError: (m) => {
            setOptimisticUserMessage(null);
            toast.error(m);
            setStreaming(false);
            setRegenerateStyle(null);
          },
          onCompressed: () => toast.info('برای بهبود عملکرد، گفتگو فشرده شد.'),
          onMemorySuggestion: (content) => {
            const toastId = 'memory-suggestion';
            toast(
              <div className="flex flex-col gap-2">
                <p className="text-sm">این اطلاعات ذخیره شود؟</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { if (activeConv) api.createMemory(activeConv, 'note', content).then(() => { toast.success('ذخیره شد'); refetchMemories(); }); toast.dismiss(toastId); }}>بله</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.dismiss(toastId)}>خیر</Button>
                </div>
              </div>,
              { id: toastId, duration: 10000 }
            );
          },
        });
      } catch (err: any) {
        toast.error(err.message || 'خطا در ارسال');
        setStreaming(false);
      }
      return;
    }

    startStream(api.chatStreamUrl(activeConv, msg, streamOpts), {
      onDelta: (c) => setStreamText(p => p + c),
      onUsage: (u) => setLastUsage({ coinCost: u.coinCost, model: u.model }),
      onDone: () => {
        setOptimisticUserMessage(null);
        setStreaming(false);
        setStreamText('');
        setRegenerateStyle(null);
        queryClient.invalidateQueries({ queryKey: ['messages', activeConv] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
      onError: (m) => { setOptimisticUserMessage(null); toast.error(m); setStreaming(false); setRegenerateStyle(null); },
      onCompressed: () => toast.info('برای بهبود عملکرد، گفتگو فشرده شد.'),
      onMemorySuggestion: (content) => {
        const toastId = 'memory-suggestion';
        toast(
          <div className="flex flex-col gap-2">
            <p className="text-sm">این اطلاعات ذخیره شود؟</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { if (activeConv) api.createMemory(activeConv, 'note', content).then(() => { toast.success('ذخیره شد'); refetchMemories(); }); toast.dismiss(toastId); }}>بله</Button>
              <Button size="sm" variant="outline" onClick={() => toast.dismiss(toastId)}>خیر</Button>
            </div>
          </div>,
          { id: toastId, duration: 10000 }
        );
      },
      refSetter: (es) => { eventSourceRef.current = es; },
    });

    if (compareMode && !regenerate) {
      setCompareStreaming(true);
      startStream(api.chatStreamUrl(activeConv, msg, { model: compareModel }), {
        onDelta: (c) => setCompareStreamText(p => p + c),
        onUsage: (u) => setCompareUsage({ coinCost: u.coinCost, model: u.model }),
        onDone: () => { setCompareStreaming(false); setCompareStreamText(''); },
        onError: () => { setCompareStreaming(false); },
        refSetter: (es) => { compareEventSourceRef.current = es; },
      });
    }
  };

  const sendQuickAction = (referenceMessageId: string, action: 'shorten' | 'formal' | 'example' | 'continue') => {
    if (!activeConv || streaming) return;
    setStreaming(true);
    setStreamText('');
    setLastUsage(null);
    const streamOpts = {
      model: advancedMode ? model : undefined,
      mode: advancedMode ? undefined : chatMode,
      quickAction: action,
      referenceMessageId,
    };
    startStream(api.chatStreamUrl(activeConv, '', streamOpts), {
      onDelta: (c) => setStreamText(p => p + c),
      onUsage: (u) => setLastUsage({ coinCost: u.coinCost, model: u.model }),
      onDone: () => {
        setStreaming(false);
        setStreamText('');
        setRegenerateStyle(null);
        queryClient.invalidateQueries({ queryKey: ['messages', activeConv] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
      onError: (m) => { setOptimisticUserMessage(null); toast.error(m); setStreaming(false); setRegenerateStyle(null); },
      onCompressed: () => toast.info('برای بهبود عملکرد، گفتگو فشرده شد.'),
      onMemorySuggestion: (content) => {
        const toastId = 'memory-suggestion';
        toast(
          <div className="flex flex-col gap-2">
            <p className="text-sm">این اطلاعات ذخیره شود؟</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { if (activeConv) api.createMemory(activeConv, 'note', content).then(() => { toast.success('ذخیره شد'); refetchMemories(); }); toast.dismiss(toastId); }}>بله</Button>
              <Button size="sm" variant="outline" onClick={() => toast.dismiss(toastId)}>خیر</Button>
            </div>
          </div>,
          { id: toastId, duration: 10000 }
        );
      },
      refSetter: (es) => { eventSourceRef.current = es; },
    });
  };

  /* ── Helpers ── */
  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('کد کپی شد');
  }, []);

  const saveSystemPrompt = async () => {
    if (!activeConv) return;
    try {
      await api.updateSystemPrompt(activeConv, systemPromptValue);
      toast.success('شخصیت ذخیره شد');
      setSystemPromptOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const exportChat = (format: 'md' | 'txt') => {
    if (!messages || !activeConvData) return;
    let content = '';
    if (format === 'md') {
      content = `# ${activeConvData.title}\n\n`;
      messages.forEach((msg: any) => { content += `### ${msg.role === 'user' ? 'کاربر' : 'دستیار'}\n${msg.content}\n\n`; });
    } else {
      messages.forEach((msg: any) => { content += `[${msg.role === 'user' ? 'کاربر' : 'دستیار'}]\n${msg.content}\n\n`; });
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConvData.title}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Memory management ── */
  const handleTriggerSummary = async () => {
    if (!activeConv) return;
    setSummarizing(true);
    try {
      await api.triggerSummary(activeConv);
      toast.success('خلاصه ایجاد شد');
      refetchMemories();
    } catch (err: any) { toast.error(err.message); }
    finally { setSummarizing(false); }
  };

  const handleAddMemory = async () => {
    if (!activeConv || !newMemoryContent.trim()) return;
    setMemoryLoading(true);
    try {
      await api.createMemory(activeConv, 'note', newMemoryContent.trim());
      setNewMemoryContent('');
      refetchMemories();
      toast.success('یادداشت اضافه شد');
    } catch (err: any) { toast.error(err.message); }
    finally { setMemoryLoading(false); }
  };

  const handleUpdateMemory = async () => {
    if (!activeConv || !editingMemory) return;
    setMemoryLoading(true);
    try {
      await api.updateMemory(activeConv, editingMemory.id, editingMemory.content);
      setEditingMemory(null);
      refetchMemories();
      toast.success('حافظه بروزرسانی شد');
    } catch (err: any) { toast.error(err.message); }
    finally { setMemoryLoading(false); }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!activeConv) return;
    try {
      await api.deleteMemory(activeConv, memoryId);
      refetchMemories();
      toast.success('حافظه حذف شد');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── Markdown renderer ── */
  const markdownComponents = useMemo(() => ({
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-7">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li>{children}</li>,
    code: ({ inline, className, children }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      if (!inline && (match || codeString.includes('\n'))) {
        return <CodeBlock lang={match?.[1] || ''} code={codeString} onCopy={copyCode} />;
      }
      return <code className="bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>;
    },
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-bold mb-2 mt-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1 mt-1">{children}</h3>,
    a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
    blockquote: ({ children }: any) => <blockquote className="border-s-2 border-primary/50 ps-3 my-2 italic text-muted-foreground text-right">{children}</blockquote>,
    table: ({ children }: any) => <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border-collapse" dir="rtl">{children}</table></div>,
    th: ({ children }: any) => <th className="border border-border px-2 py-1 bg-muted font-medium text-right">{children}</th>,
    td: ({ children }: any) => <td className="border border-border px-2 py-1 text-right">{children}</td>,
  }), [copyCode]);

  /* ══════════════════════════════════════════
   * ██  R E N D E R  (Genie-style shell)
   * ══════════════════════════════════════════ */
  return (
    <div className="flex h-full min-h-0 gap-2 sm:gap-4 text-right overflow-hidden max-w-full" dir="rtl">

      {/* ─────────── لیست گفتگوها (سمت راست برای کاربر ایرانی، اسکرول داخلی) ─────────── */}
      <div className={cn(
        'flex flex-col w-full md:w-72 lg:w-80 flex-shrink-0 min-h-0 min-w-0 rounded-2xl md:rounded-[28px] glass overflow-hidden border border-border',
        !showList && 'hidden md:flex',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-row-reverse">
          <h2 className="text-base font-semibold text-foreground">گفتگوها</h2>
          <div className="flex items-center gap-1 flex-row-reverse">
            <Button
              variant={showArchived ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowArchived(!showArchived)}
              title={showArchived ? 'گفتگوهای فعال' : 'آرشیو'}
            >
              {showArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:opacity-90" onClick={createConversation}>
              <Plus className="h-3.5 w-3.5 ms-1" /> جدید
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative px-4 pb-2">
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو..."
            className="h-8 text-xs rounded-xl bg-background/50 border-border text-right pl-8 pr-3"
            dir="rtl"
          />
        </div>

        {/* فیلتر بر اساس مدل */}
        {uniqueModels.length > 0 && (
          <div className="px-4 pb-2 flex items-center gap-2 flex-row-reverse">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">مدل:</span>
            <Select value={filterByModel} onValueChange={setFilterByModel}>
              <SelectTrigger className="h-7 text-[10px] flex-1 min-w-0 border-border" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                {uniqueModels.map((m: string) => (
                  <SelectItem key={m} value={m}>
                    <span className="truncate block">{modelDisplayName(m)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* List */}
        <ScrollArea className="flex-1 min-h-0 px-3">
          <div className="space-y-1 py-2">
            {convsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)
            ) : filteredConversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">{showArchived ? 'آرشیو خالی است' : filterByModel !== 'all' ? 'گفتگویی با این مدل نیست' : 'هنوز گفتگویی نداری — کنجکاوی کن، یکی بساز'}</p>
            ) : (
              filteredConversations.map((conv: any) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-2xl px-3 py-2.5 cursor-pointer transition-all duration-150 flex-row-reverse',
                    activeConv === conv.id
                      ? 'bg-primary/15 border border-primary/30 shadow-sm'
                      : 'hover:bg-accent/50 border border-transparent'
                  )}
                  onClick={() => { setActiveConv(conv.id); setShowList(false); }}
                >
                  {/* Icon */}
                  {conv.isPinned
                    ? <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    : <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  }

                  {/* Title + مدل */}
                  <div className="flex-1 min-w-0 flex flex-col items-end gap-0.5">
                  {editingTitle === conv.id ? (
                    <Input
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(conv.id); if (e.key === 'Escape') setEditingTitle(null); }}
                      onBlur={() => saveTitle(conv.id)}
                      className="h-6 text-xs flex-1 px-1 text-right"
                      dir="rtl"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-xs truncate w-full text-foreground text-right">{conv.title}</span>
                  )}
                    {conv.model && (
                      <span className="text-[10px] text-muted-foreground truncate w-full text-right" title={conv.model}>
                        {modelDisplayName(conv.model)}
                      </span>
                    )}
                  </div>

                  {/* Context menu (replaces 4 hover buttons) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 text-right">
                      <DropdownMenuItem onClick={() => { setEditingTitle(conv.id); setEditTitleValue(conv.title); }}>
                        <Pencil className="h-3.5 w-3.5 me-2" /> ویرایش نام
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePin(conv.id)}>
                        {conv.isPinned ? <PinOff className="h-3.5 w-3.5 me-2" /> : <Pin className="h-3.5 w-3.5 me-2" />}
                        {conv.isPinned ? 'برداشتن پین' : 'پین کردن'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleArchive(conv.id)}>
                        {conv.isArchived ? <ArchiveRestore className="h-3.5 w-3.5 me-2" /> : <Archive className="h-3.5 w-3.5 me-2" />}
                        {conv.isArchived ? 'بازیابی' : 'آرشیو'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteConversation(conv.id)}>
                        <Trash2 className="h-3.5 w-3.5 me-2" /> حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─────────── Main Chat Area (اسکرول فقط داخل باکس پیام‌ها؛ جلوگیری از رفتن محتوا زیر منو) ─────────── */}
      <div className={cn('flex-1 flex flex-col min-w-0 min-h-0 rounded-2xl md:rounded-[28px] glass overflow-hidden border border-border', showList && !activeConv && 'hidden md:flex')}>
        {user != null && (user.coins ?? 0) < 100 && (
          <div className="mx-2 mt-2 mb-1 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Coins className="h-4 w-4 flex-shrink-0" />
            <span>اعتبار شما کم است ({user.coins} سکه). برای ادامه از بخش صورتحساب شارژ کنید.</span>
          </div>
        )}
        {!activeConv ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-4">
              <div className="h-20 w-20 mx-auto rounded-2xl glass-subtle flex items-center justify-center">
                <MessageSquare className="h-10 w-10 opacity-30" />
              </div>
              <p className="text-sm">یک گفتگو انتخاب کنید یا گفتگوی جدید بسازید</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                <Button size="sm" onClick={createConversation} className="gap-1.5">
                  <Plus className="h-4 w-4" /> گفتگوی جدید
                </Button>
                <Button className="md:hidden" variant="outline" size="sm" onClick={() => setShowList(true)}>
                  <ChevronRight className="h-4 w-4 ms-1" aria-hidden /> لیست گفتگوها
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── هدر و نوار ابزار چت (ثابت، بدون اسکرول) ── */}
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap flex-row-reverse flex-shrink-0 px-1 sm:px-2">
              {/* دکمه بازگشت به لیست (موبایل) — سمت راست */}
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8 md:hidden flex-shrink-0" onClick={() => setShowList(true)} title="لیست گفتگوها">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>

              {/* Smart Modes (or model selector when advanced) */}
              {advancedMode ? (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger
                    className="h-8 text-xs text-right max-w-[10rem] sm:max-w-[12rem] min-w-0 shrink [&>span]:truncate [&>span]:block [&>span]:text-right"
                    title={models?.find((m: any) => m.id === model) ? `${modelDisplayName(models.find((m: any) => m.id === model).name)} — ${models.find((m: any) => m.id === model).coinCost} سکه` : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-1.5">
                          {modelDisplayName(m.name)}
                          <span className="text-[10px] text-muted-foreground">({m.coinCost} سکه)</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex rounded-lg sm:rounded-xl border border-border p-0.5 bg-muted/50 flex-row-reverse flex-wrap gap-0.5">
                  {(['fast', 'economy', 'accurate'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setChatMode(m)}
                      className={cn(
                        'px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs rounded-md sm:rounded-lg transition-colors whitespace-nowrap',
                        chatMode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {m === 'fast' && <><span className="hidden sm:inline">⚡ سریع</span><span className="sm:hidden">⚡</span></>}
                      {m === 'economy' && <><span className="hidden sm:inline">💰 اقتصادی</span><span className="sm:hidden">💰</span></>}
                      {m === 'accurate' && <><span className="hidden sm:inline">🧠 دقیق</span><span className="sm:hidden">🧠</span></>}
                    </button>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={() => setAdvancedMode(!advancedMode)}>
                {advancedMode ? 'ساده' : 'پیشرفته'}
              </Button>

              {/* Compare mode toggle */}
              {compareMode && (
                <Select value={compareModel} onValueChange={setCompareModel}>
                  <SelectTrigger className="w-40 h-8 text-xs border-purple-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.filter((m: any) => m.id !== model).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{modelDisplayName(m.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex-1 min-w-0" />

              {/* دکمه‌های عمل (سمت راست در RTL) */}
              <div className="flex items-center gap-1 flex-row-reverse">
                <Button
                  variant={compareMode ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCompareMode(!compareMode)}
                  title="مقایسه مدل‌ها"
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => { setMemoryOpen(true); }}
                  title="حافظه مکالمه"
                >
                  <Brain className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => { setSystemPromptValue(activeConvData?.systemPrompt || ''); setSystemPromptOpen(true); }}
                  title="شخصیت AI"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>

                {/* Export dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="خروجی">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => exportChat('md')}>
                      <FileText className="h-3.5 w-3.5 me-2" /> Markdown (.md)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportChat('txt')}>
                      <FileText className="h-3.5 w-3.5 me-2" /> Text (.txt)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* ── ناحیه پیام‌ها: فقط این بلوک اسکرول دارد؛ محتوا افقی اسکرول می‌شود تا زیر منو نرود ── */}
            <div className="flex-1 min-h-0 overflow-hidden overflow-x-hidden rounded-2xl bg-card/50 border border-border mx-2 mb-2 flex flex-col min-w-0" dir="rtl">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4 text-right min-w-0 break-words overflow-x-auto max-w-full">
                  {msgsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={cn('flex gap-3', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                        <Skeleton className="h-16 w-3/5 rounded-2xl" />
                      </div>
                    ))
                  ) : messages?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Bot className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm">شروع گفتگو...</p>
                    </div>
                  ) : (
                    messages?.map((msg: any, idx: number) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={msg.id} className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
                          {/* آواتار */}
                          <div className={cn(
                            'h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                            isUser ? 'bg-primary/15 backdrop-blur-sm' : 'bg-primary/10 backdrop-blur-sm'
                          )}>
                            {isUser ? <User className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
                          </div>

                          {/* حباب پیام + فوتر (متن راست‌چین) */}
                          <div className={cn('max-w-[90%] sm:max-w-[75%] space-y-1 text-right', isUser ? 'items-end' : 'items-start')}>
                            <div className={cn(
                              'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                              isUser
                                ? 'bg-primary text-primary-foreground shadow-glass-sm whitespace-pre-wrap text-right'
                                : 'glass-subtle text-right'
                            )} dir="auto">
                              {isUser ? msg.content : (
                                <div className="prose-sm prose-p:text-right prose-ul:text-right prose-ol:text-right prose-li:text-right max-w-none" dir="auto">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
                                </div>
                              )}
                            </div>

                            {/* فوتر: زمان، اکشن‌ها، متا */}
                            <div className={cn('flex items-center gap-1.5 px-1 flex-row-reverse', isUser ? 'justify-start' : 'justify-end')}>
                              <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>

                              <button onClick={() => copyMessage(msg.id, msg.content)} className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted/50 transition-colors" title="کپی">
                                {copiedId === msg.id ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5 text-muted-foreground" />}
                              </button>

                              {!isUser && idx === (messages?.length || 0) - 1 && !streaming && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted/50 transition-colors" title="بازتولید">
                                      <RefreshCw className="h-2.5 w-2.5 text-muted-foreground" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-right">
                                    <DropdownMenuItem onClick={() => sendMessage(true, 'different')}>پاسخ متفاوت</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => sendMessage(true, 'accurate')}>دقیق‌تر</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => sendMessage(true, 'creative')}>خلاق‌تر</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted/50 transition-colors">
                                    <MoreHorizontal className="h-2.5 w-2.5 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-right">
                                  <DropdownMenuItem onClick={() => copyMessage(msg.id, msg.content)}>
                                    <Copy className="h-3 w-3 me-2" /> کپی
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={async () => {
                                    if (!activeConv) return;
                                    try {
                                      const newConv = await api.forkConversation(activeConv, msg.id);
                                      queryClient.invalidateQueries({ queryKey: ['conversations'] });
                                      setActiveConv(newConv.id);
                                      setShowList(false);
                                      queryClient.invalidateQueries({ queryKey: ['messages', newConv.id] });
                                      toast.success('گفتگوی جدید از این پیام ساخته شد.');
                                    } catch (err: any) { toast.error(err.message); }
                                  }}>
                                    <GitCompareArrows className="h-3 w-3 me-2" /> ادامه از اینجا
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {msg.metadata && (() => {
                                try {
                                  const meta = JSON.parse(msg.metadata);
                                  return (
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      {meta.coinCost != null && <><Coins className="h-2.5 w-2.5" />{meta.coinCost}</>}
                                      {meta.model && <span className="opacity-60">{meta.model.split('/').pop()}</span>}
                                    </span>
                                  );
                                } catch { return null; }
                              })()}
                            </div>

                            {/* اکشن‌های سریع زیر پیام دستیار */}
                            {!isUser && !streaming && (
                              <div className="flex flex-wrap gap-1 mt-1.5 px-1 flex-row-reverse justify-end">
                                {(['shorten', 'formal', 'example', 'continue'] as const).map((action) => (
                                  <button
                                    key={action}
                                    type="button"
                                    onClick={() => sendQuickAction(msg.id, action)}
                                    className="text-[10px] py-1 px-2 rounded-md border border-transparent hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {action === 'shorten' && 'کوتاه‌تر کن'}
                                    {action === 'formal' && 'رسمی‌تر کن'}
                                    {action === 'example' && 'مثال بزن'}
                                    {action === 'continue' && 'ادامه بده'}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* پیام کاربر به‌صورت خوش‌بینانه بلافاصله بعد از ارسال */}
                  {optimisticUserMessage && (
                    <div className="flex gap-2.5 flex-row-reverse text-right">
                      <div className="h-7 w-7 rounded-full bg-primary/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="max-w-[90%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-sm bg-primary text-primary-foreground shadow-glass-sm whitespace-pre-wrap text-right" dir="auto">
                        {optimisticUserMessage}
                      </div>
                    </div>
                  )}

                  {/* Streaming bubble — پاسخ در لحظه در حال نوشته شدن */}
                  {streaming && (
                    <div className="flex gap-2.5 flex-row text-right">
                      <div className="h-7 w-7 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="max-w-[90%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-sm glass-subtle leading-relaxed text-right min-h-[2rem]" dir="auto">
                        {(streamText && (
                          <div className="prose-sm prose-p:text-right max-w-none" dir="auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{streamText}</ReactMarkdown>
                          </div>
                        )) || null}
                        <span className="inline-block w-1.5 h-4 bg-primary/60 rounded-sm animate-pulse align-middle me-0.5" aria-hidden />
                      </div>
                    </div>
                  )}

                  {/* Compare streaming */}
                  {compareMode && (compareStreaming || compareStreamText) && (
                    <div className="flex gap-2.5 flex-row-reverse text-right" dir="rtl">
                      <div className="h-7 w-7 rounded-full bg-purple-500/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-1">
                        <GitCompareArrows className="h-3.5 w-3.5 text-purple-500" />
                      </div>
                      <div className="max-w-[90%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-sm glass-subtle border border-purple-500/20 leading-relaxed text-right">
                        <span className="block text-[10px] text-purple-500 font-medium mb-1">{compareModel.split('/').pop()}</span>
                        <div className="prose-sm prose-p:text-right prose-ul:text-right prose-ol:text-right max-w-none" dir="rtl">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{compareStreamText}</ReactMarkdown>
                        </div>
                        {compareStreaming && <span className="inline-block w-1.5 h-4 bg-purple-500/60 rounded-sm animate-pulse align-middle ms-0.5" />}
                        {compareUsage && !compareStreaming && (
                          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Coins className="h-2.5 w-2.5" />{compareUsage.coinCost} سکه</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Usage summary */}
                  {lastUsage && !streaming && (
                    <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground py-1">
                      <Coins className="h-3 w-3" />
                      <span>{lastUsage.coinCost} سکه</span>
                      <span className="opacity-40">•</span>
                      <span>{lastUsage.model?.split('/').pop()}</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* ── ناحیه ورودی (ثابت پایین، بدون اسکرول) ── */}
            <div className="mt-2 space-y-1 flex-shrink-0 px-2 pb-2 safe-area-inset-bottom">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/50 border border-border flex-row-reverse">
                  {attachedFiles.map((a) => (
                    <div key={a.id} className="flex items-center gap-1.5 text-xs flex-row-reverse">
                      {a.preview ? (
                        <img src={a.preview} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate max-w-[120px]">{a.file.name}</span>
                      <button type="button" onClick={() => setAttachedFiles((prev) => prev.filter((x) => x.id !== a.id))} className="p-0.5 rounded hover:bg-muted">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2 flex-row-reverse">
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
                  <Button type="button" variant="ghost" size="icon" className="h-[44px] w-[44px] rounded-xl flex-shrink-0" onClick={() => fileInputRef.current?.click()} title="پیوست فایل (تصویر یا PDF)">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                <div className="flex-1 relative min-w-0">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="پیام خود را بنویسید..."
                    className="min-h-[44px] max-h-[120px] resize-none py-2.5 text-sm text-right ps-3 pe-3"
                    disabled={streaming}
                    dir="rtl"
                  />
                </div>
                {streaming ? (
                  <Button onClick={stopGeneration} size="icon" variant="destructive" className="h-[44px] w-[44px] rounded-xl flex-shrink-0">
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => sendMessage()} disabled={!message.trim() && attachedFiles.length === 0} size="icon" className="h-[44px] w-[44px] rounded-xl flex-shrink-0 bg-primary text-primary-foreground hover:opacity-90">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {estimatedCoins != null && message.trim() && (
                <p className="text-[10px] text-muted-foreground px-1 text-right">هزینه: {estimatedCoins} سکه</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─────────── System Prompt Dialog ─────────── */}
      <Dialog open={systemPromptOpen} onOpenChange={setSystemPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>شخصیت دستیار</DialogTitle>
            <DialogDescription>System prompt را تنظیم کنید تا رفتار AI در این گفتگو تغییر کند.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>System Prompt</Label>
            <Textarea
              value={systemPromptValue}
              onChange={(e) => setSystemPromptValue(e.target.value)}
              placeholder="مثال: تو مترجم حرفه‌ای فارسی–انگلیسی هستی؛ دقیق و روان ترجمه می‌کنی."
              rows={5}
              dir="rtl"
            />
            <p className="text-xs text-muted-foreground">خالی = شخصیت پیش‌فرض (بازیگوش و دقیق).</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSystemPromptOpen(false)}>انصراف</Button>
            <Button onClick={saveSystemPrompt}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────── Memory Management Dialog ─────────── */}
      <Dialog open={memoryOpen} onOpenChange={setMemoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              حافظه مکالمه
            </DialogTitle>
            <DialogDescription>
              خلاصه‌ها و یادداشت‌های ذخیره‌شده برای این گفتگو. AI از این حافظه‌ها برای ادامه مکالمه استفاده می‌کند.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {/* Current summary */}
            {activeConvData?.summary && (
              <div className="rounded-lg glass-subtle p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">خلاصه فعلی</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{activeConvData.summary}</p>
              </div>
            )}

            {/* Trigger summary button */}
            <Button variant="outline" size="sm" className="w-full" onClick={handleTriggerSummary} disabled={summarizing}>
              {summarizing ? <Loader2 className="h-3.5 w-3.5 me-2 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 me-2" />}
              ایجاد خلاصه جدید
            </Button>

            {/* Memory entries */}
            {memories && memories.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">حافظه‌ها ({memories.length})</p>
                {memories.map((mem: any) => (
                  <div key={mem.id} className="rounded-lg border border-[hsl(var(--glass-border-subtle))] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">{mem.type === 'summary' ? 'خلاصه' : 'یادداشت'}</Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingMemory({ id: mem.id, content: mem.content })}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteMemory(mem.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {editingMemory && editingMemory.id === mem.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingMemory.content}
                          onChange={(e) => setEditingMemory({ id: editingMemory.id, content: e.target.value })}
                          rows={3}
                          className="text-xs"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditingMemory(null)}>انصراف</Button>
                          <Button size="sm" onClick={handleUpdateMemory} disabled={memoryLoading}>
                            {memoryLoading && <Loader2 className="h-3 w-3 me-1 animate-spin" />}
                            ذخیره
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{mem.content}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{mem.messageCount} پیام</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add new memory */}
            <div className="space-y-2 pt-2 border-t border-[hsl(var(--glass-border-subtle))]">
              <p className="text-xs font-medium text-muted-foreground">افزودن یادداشت جدید</p>
              <Textarea
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                placeholder="یک یادداشت یا اطلاعات مهم برای حافظه AI..."
                rows={2}
                className="text-xs"
              />
              <Button size="sm" onClick={handleAddMemory} disabled={!newMemoryContent.trim() || memoryLoading}>
                {memoryLoading ? <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 me-1" />}
                افزودن
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
