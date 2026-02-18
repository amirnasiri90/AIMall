'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, BarChart3, Coins, Activity, Search, Loader2,
  MessageSquare, FileText, ImageIcon, Mic, Download, Settings,
  Shield, RefreshCw, Eye, Database, Wrench, ChevronDown, FileSignature,
  DollarSign, Package, Tag, Pencil, Plus, Trash2, Cpu, Key, CheckCircle2, XCircle, HelpCircle,
  Image as ImageIconLucide, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { formatDate, formatNumber, cn } from '@/lib/utils';

function AdminTicketAttachmentImg({ ticketId, attachmentUrl }: { ticketId: string; attachmentUrl: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    api.getAdminTicketAttachmentBlobUrl(ticketId, attachmentUrl).then((url) => {
      objectUrl = url;
      setSrc(url);
    }).catch(() => setSrc(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [ticketId, attachmentUrl]);
  if (!src) return <div className="rounded-lg bg-muted flex items-center justify-center h-20 text-muted-foreground"><ImageIconLucide className="h-5 w-5" /></div>;
  return <img src={src} alt="پیوست" className="rounded-lg max-h-40 object-contain border bg-muted mt-1" />;
}

const serviceIcons: Record<string, any> = {
  chat: MessageSquare, text: FileText, image: ImageIcon, audio: Mic,
};

/** ارائه‌دهندگان قابل استفاده در هر بخش (بر اساس category در پنل) */
const PROVIDERS_FOR_SECTION: Record<string, { key: string; name: string }[]> = {
  chat: [
    { key: 'openrouter', name: 'OpenRouter' },
    { key: 'xai', name: 'Grok (X.AI)' },
    { key: 'google_gemini', name: 'Google Gemini' },
    { key: 'anthropic_claude', name: 'Anthropic Claude' },
    { key: 'perplexity', name: 'Perplexity' },
    { key: 'openai', name: 'OpenAI' },
  ],
  text: [
    { key: 'openrouter', name: 'OpenRouter' },
    { key: 'xai', name: 'Grok (X.AI)' },
    { key: 'google_gemini', name: 'Google Gemini' },
    { key: 'anthropic_claude', name: 'Anthropic Claude' },
    { key: 'openai', name: 'OpenAI' },
  ],
  image: [
    { key: 'openrouter', name: 'OpenRouter (Flux و غیره)' },
    { key: 'openai', name: 'OpenAI (DALL-E)' },
    { key: 'flux', name: 'Flux' },
    { key: 'xai', name: 'Grok' },
    { key: 'google_gemini', name: 'Gemini' },
    { key: 'nanobenana', name: 'NanoBenana' },
  ],
  video: [
    { key: 'veo', name: 'Google Veo' },
    { key: 'luma', name: 'Luma' },
    { key: 'nanobenana', name: 'NanoBenana' },
  ],
  tts: [
    { key: 'openrouter', name: 'OpenRouter' },
    { key: 'openai', name: 'OpenAI TTS' },
    { key: 'elevenlabs', name: 'ElevenLabs' },
  ],
  stt: [
    { key: 'openrouter', name: 'OpenRouter (Whisper)' },
    { key: 'openai', name: 'OpenAI Whisper' },
    { key: 'deepgram', name: 'Deepgram' },
    { key: 'azure_speech', name: 'Azure Speech' },
  ],
};

/** مدل‌های هر ارائه‌دهنده به تفکیک بخش */
const MODELS_BY_SECTION_AND_PROVIDER: Record<string, Record<string, { id: string; label: string }[]>> = {
  chat: {
    openrouter: [
      { id: 'openai/gpt-5.2', label: 'GPT-5.2' },
      { id: 'openai/gpt-5.2-pro', label: 'GPT-5.2 Pro' },
      { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
      { id: 'openai/gpt-5', label: 'GPT-5' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
      { id: 'google/gemini-pro', label: 'Gemini Pro' },
      { id: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'meta-llama/llama-3-8b-instruct', label: 'Llama 3 8B' },
      { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
    ],
    xai: [
      { id: 'grok-3-mini', label: 'Grok 3 Mini' },
      { id: 'grok-3', label: 'Grok 3' },
    ],
    google_gemini: [
      { id: 'gemini-pro', label: 'Gemini Pro' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
    anthropic_claude: [
      { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      { id: 'claude-3.5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    ],
    perplexity: [
      { id: 'llama-3.1-sonar-small-128k-online', label: 'Sonar Small' },
      { id: 'llama-3.1-sonar-large-128k-online', label: 'Sonar Large' },
    ],
    openai: [
      { id: 'gpt-5.2', label: 'GPT-5.2' },
      { id: 'gpt-5.2-pro', label: 'GPT-5.2 Pro' },
      { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { id: 'gpt-5', label: 'GPT-5' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { id: 'o1', label: 'o1' },
      { id: 'o1-mini', label: 'o1 Mini' },
    ],
  },
  text: {
    openrouter: [
      { id: 'openai/gpt-5.2', label: 'GPT-5.2' },
      { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'google/gemini-pro', label: 'Gemini Pro' },
      { id: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
    xai: [
      { id: 'grok-3-mini', label: 'Grok 3 Mini' },
      { id: 'grok-3', label: 'Grok 3' },
    ],
    google_gemini: [
      { id: 'gemini-pro', label: 'Gemini Pro' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
    anthropic_claude: [
      { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      { id: 'claude-3.5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    ],
    openai: [
      { id: 'gpt-5.2', label: 'GPT-5.2' },
      { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'o1', label: 'o1' },
      { id: 'o1-mini', label: 'o1 Mini' },
    ],
  },
  image: {
    openrouter: [
      { id: 'flux', label: 'Flux' },
      { id: 'flux-realism', label: 'Flux Realism' },
      { id: 'turbo', label: 'Turbo' },
    ],
    openai: [
      { id: 'dall-e-3', label: 'DALL-E 3' },
      { id: 'dall-e-2', label: 'DALL-E 2' },
    ],
    flux: [{ id: 'flux', label: 'Flux' }],
    xai: [{ id: 'grok-image', label: 'Grok Image' }],
    google_gemini: [{ id: 'gemini-image', label: 'Gemini Image' }],
    nanobenana: [{ id: 'nanobenana', label: 'NanoBenana' }],
  },
  video: {
    veo: [{ id: 'veo', label: 'Veo' }],
    luma: [{ id: 'luma', label: 'Luma' }],
    nanobenana: [{ id: 'nanobenana', label: 'NanoBenana' }],
  },
  tts: {
    openrouter: [
      { id: 'openai/tts-1', label: 'OpenAI TTS-1' },
      { id: 'openai/tts-1-hd', label: 'OpenAI TTS-1 HD' },
    ],
    openai: [
      { id: 'tts-1', label: 'TTS-1' },
      { id: 'tts-1-hd', label: 'TTS-1 HD' },
    ],
    elevenlabs: [
      { id: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2' },
      { id: 'eleven_turbo_v2', label: 'Eleven Turbo v2' },
    ],
  },
  stt: {
    openrouter: [
      { id: 'openai/whisper-large-v3', label: 'Whisper Large v3' },
      { id: 'openai/whisper-1', label: 'Whisper v1' },
    ],
    openai: [
      { id: 'whisper-1', label: 'Whisper v1' },
      { id: 'whisper-large-v3', label: 'Whisper Large v3' },
    ],
    deepgram: [{ id: 'nova-2', label: 'Nova 2' }],
    azure_speech: [{ id: 'azure-stt', label: 'Azure STT' }],
  },
};

function getModelsForSectionProvider(section: string, providerKey: string): { id: string; label: string }[] {
  if (!providerKey) return [];
  const bySection = MODELS_BY_SECTION_AND_PROVIDER[section];
  if (!bySection) return [];
  const models = bySection[providerKey];
  if (models?.length) return models;
  return [{ id: providerKey, label: providerKey }];
}

/* ── Simple bar chart component ── */
function MiniBarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  return (
    <div className="flex items-end gap-[2px] h-16">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm ${color} transition-all duration-300`}
          style={{ height: `${maxVal > 0 ? (v / maxVal) * 100 : 0}%`, minHeight: v > 0 ? '2px' : '0' }}
          title={String(v)}
        />
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [coinDialog, setCoinDialog] = useState<any>(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [coinReason, setCoinReason] = useState('');
  const [coinLoading, setCoinLoading] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [settingEditing, setSettingEditing] = useState<{ key: string; value: string } | null>(null);
  const [settingSaving, setSettingSaving] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState('');
  const [auditEntity, setAuditEntity] = useState('');
  const [orgPage, setOrgPage] = useState(1);
  const [orgSearch, setOrgSearch] = useState('');
  const [contractDialog, setContractDialog] = useState<any>(null);
  const [contractEndsAt, setContractEndsAt] = useState('');
  const [customCoinQuota, setCustomCoinQuota] = useState('');
  const [contractPlan, setContractPlan] = useState('');
  const [contractSaving, setContractSaving] = useState(false);
  const [editUserDialog, setEditUserDialog] = useState<any>(null);
  const [userEditForm, setUserEditForm] = useState<{ name: string; email: string; role: string; coins: number; password: string }>({ name: '', email: '', role: 'USER', coins: 0, password: '' });
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [pricingCoinPrice, setPricingCoinPrice] = useState('');
  const [pricingModelCosts, setPricingModelCosts] = useState<Record<string, Record<string, string>>>({ chat: {}, text: {}, image: {}, video: {}, tts: {}, stt: {} });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [packageDialog, setPackageDialog] = useState<{ pkg?: any } | null>(null);
  const [packageForm, setPackageForm] = useState<{ name: string; coins: string; priceIRR: string; description: string; sortOrder: string; discountPercent: string; isActive: boolean; packageType: string }>({ name: '', coins: '', priceIRR: '', description: '', sortOrder: '0', discountPercent: '0', isActive: true, packageType: 'PERSONAL' });
  const [packageSaving, setPackageSaving] = useState(false);
  const [discountCodePage, setDiscountCodePage] = useState(1);
  const [discountCodeDialog, setDiscountCodeDialog] = useState<{ dc?: any } | null>(null);
  const [discountCodeForm, setDiscountCodeForm] = useState<{ code: string; type: 'PERCENT' | 'FIXED'; value: string; minOrderIRR: string; maxUses: string; validFrom: string; validTo: string; isActive: boolean }>({ code: '', type: 'PERCENT', value: '', minOrderIRR: '', maxUses: '', validFrom: '', validTo: '', isActive: true });
  const [discountCodeSaving, setDiscountCodeSaving] = useState(false);
  const [providerEditDialog, setProviderEditDialog] = useState<any>(null);
  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerEnabled, setProviderEnabled] = useState(true);
  const [providerTestLoading, setProviderTestLoading] = useState(false);
  const [providerTestResult, setProviderTestResult] = useState<{ ok: boolean; message?: string; latencyMs?: number; responsePreview?: string } | null>(null);
  const [providerSaving, setProviderSaving] = useState(false);
  const [serviceMappingDraft, setServiceMappingDraft] = useState<Record<string, Array<{ providerKey: string; modelId: string; label?: string }>> | null>(null);
  const [serviceMappingSaving, setServiceMappingSaving] = useState(false);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReply, setTicketReply] = useState('');
  const [ticketReplyAttachment, setTicketReplyAttachment] = useState<File | null>(null);
  const [ticketReplySending, setTicketReplySending] = useState(false);
  const [ticketStatusUpdating, setTicketStatusUpdating] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: api.getAdminStats, enabled: isAdmin });
  const { data: serviceStats } = useQuery({ queryKey: ['admin-service-stats'], queryFn: api.getServiceStats, enabled: isAdmin });
  const { data: dailyStats } = useQuery({ queryKey: ['admin-daily-stats'], queryFn: () => api.getDailyStats(14), enabled: isAdmin });
  const { data: revenueStats } = useQuery({ queryKey: ['admin-revenue-stats'], queryFn: () => api.getRevenueStats(30), enabled: isAdmin });
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', search, userPage, roleFilter],
    queryFn: () => api.getAdminUsers(search, userPage, 10, roleFilter === 'all' ? undefined : roleFilter),
    enabled: isAdmin,
  });
  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: () => api.getAdminSettings(), enabled: isAdmin });
  const { data: ticketsData } = useQuery({
    queryKey: ['admin-tickets', ticketPage, ticketStatusFilter || undefined, ticketCategoryFilter || undefined],
    queryFn: () => api.getAdminTickets({ page: ticketPage, limit: 15, status: ticketStatusFilter || undefined, category: ticketCategoryFilter || undefined }),
    enabled: isAdmin,
  });
  const { data: selectedTicket } = useQuery({
    queryKey: ['admin-ticket', selectedTicketId],
    queryFn: () => api.getAdminTicket(selectedTicketId!),
    enabled: isAdmin && !!selectedTicketId,
  });
  const { data: auditData } = useQuery({
    queryKey: ['admin-audit-logs', auditPage, auditAction, auditEntity],
    queryFn: () => api.getAuditLogs({
      page: auditPage,
      limit: 20,
      ...(auditAction ? { action: auditAction } : {}),
      ...(auditEntity ? { entity: auditEntity } : {}),
    }),
    enabled: isAdmin,
  });
  const { data: providersHealth } = useQuery({ queryKey: ['admin-providers-health'], queryFn: api.getProvidersHealth, enabled: isAdmin });
  const { data: slaStatus } = useQuery({ queryKey: ['admin-sla-status'], queryFn: api.getSlaStatus, enabled: isAdmin });
  const { data: slaTargets } = useQuery({ queryKey: ['admin-sla-targets'], queryFn: api.getSlaTargets, enabled: isAdmin });
  const { data: orgsData } = useQuery({
    queryKey: ['admin-organizations', orgPage, orgSearch],
    queryFn: () => api.getAdminOrganizations(orgPage, 20, orgSearch || undefined),
    enabled: isAdmin,
  });
  const { data: adminPricing } = useQuery({ queryKey: ['admin-pricing'], queryFn: api.getAdminPricing, enabled: isAdmin });
  const { data: adminModelCosts } = useQuery({ queryKey: ['admin-model-costs'], queryFn: api.getAdminModelCosts, enabled: isAdmin });
  const { data: adminPackages } = useQuery({ queryKey: ['admin-packages'], queryFn: api.getAdminPackages, enabled: isAdmin });
  const { data: discountCodesData } = useQuery({
    queryKey: ['admin-discount-codes', discountCodePage],
    queryFn: () => api.getAdminDiscountCodes(discountCodePage, 20),
    enabled: isAdmin,
  });
  const { data: aiProvidersList } = useQuery({ queryKey: ['admin-ai-providers'], queryFn: api.getAiProviders, enabled: isAdmin });
  const { data: serviceMappingData } = useQuery({ queryKey: ['admin-service-mapping'], queryFn: api.getServiceMapping, enabled: isAdmin });
  const { data: branding, refetch: refetchBranding } = useQuery({
    queryKey: ['branding'],
    queryFn: api.getBranding,
  });
  const [logoUploading, setLogoUploading] = useState<string | null>(null);
  const { data: editUserData } = useQuery({
    queryKey: ['admin-user', editUserDialog?.id],
    queryFn: () => api.getAdminUser(editUserDialog!.id),
    enabled: isAdmin && !!editUserDialog?.id,
  });

  useEffect(() => {
    if (adminPricing?.coinPriceIRR != null) setPricingCoinPrice(String(adminPricing.coinPriceIRR));
  }, [adminPricing?.coinPriceIRR]);
  useEffect(() => {
    if (!adminModelCosts) return;
    const next: Record<string, Record<string, string>> = { text: {}, image: {}, tts: {}, stt: {} };
    (['text', 'image', 'tts', 'stt'] as const).forEach((svc) => {
      const m = adminModelCosts[svc];
      if (m && typeof m === 'object') Object.entries(m).forEach(([k, v]) => { next[svc][k] = String(v); });
    });
    setPricingModelCosts(next);
  }, [adminModelCosts]);
  useEffect(() => {
    if (editUserData) {
      setUserEditForm({
        name: editUserData.name ?? '',
        email: editUserData.email ?? '',
        role: editUserData.role ?? 'USER',
        coins: editUserData.coins ?? 0,
        password: '',
      });
    }
  }, [editUserData]);
  useEffect(() => {
    if (serviceMappingData && serviceMappingDraft === null) setServiceMappingDraft(serviceMappingData);
  }, [serviceMappingData, serviceMappingDraft]);
  const openProviderEdit = async (p: any) => {
    setProviderEditDialog(p);
    setProviderApiKey('');
    setProviderEnabled(p.isEnabled);
    setProviderTestResult(null);
    try {
      const detail = await api.getAiProvider(p.id);
      if (detail) setProviderEnabled(detail.isEnabled);
    } catch {}
  };
  const handleTestProvider = async () => {
    if (!providerEditDialog?.id) return;
    setProviderTestLoading(true);
    setProviderTestResult(null);
    try {
      const result = await api.testAiProvider(providerEditDialog.id, providerApiKey || undefined);
      setProviderTestResult(result);
      if (result.ok) toast.success('اتصال موفق');
      else toast.error(result.message || 'خطا در اتصال');
    } catch (err: any) {
      setProviderTestResult({ ok: false, message: err.message });
      toast.error(err.message);
    } finally {
      setProviderTestLoading(false);
    }
  };
  const handleSaveProvider = async () => {
    if (!providerEditDialog?.id) return;
    setProviderSaving(true);
    try {
      await api.updateAiProvider(providerEditDialog.id, {
        apiKey: providerApiKey || undefined,
        isEnabled: providerEnabled,
      });
      toast.success('ذخیره شد');
      setProviderEditDialog(null);
      queryClient.invalidateQueries({ queryKey: ['admin-ai-providers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-providers-health'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProviderSaving(false);
    }
  };
  const handleSaveServiceMapping = async () => {
    if (!serviceMappingDraft) return;
    setServiceMappingSaving(true);
    try {
      const updated = await api.setServiceMapping(serviceMappingDraft);
      toast.success('نقشه سرویس‌ها ذخیره شد');
      setServiceMappingDraft(updated);
      queryClient.invalidateQueries({ queryKey: ['admin-service-mapping'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setServiceMappingSaving(false);
    }
  };
  const updateMappingEntry = (section: string, index: number, field: 'providerKey' | 'modelId' | 'label', value: string) => {
    if (!serviceMappingDraft) return;
    const list = [...(serviceMappingDraft[section] || [])];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: value };
    setServiceMappingDraft({ ...serviceMappingDraft, [section]: list });
  };
  const updateMappingEntryBatch = (section: string, index: number, updates: Partial<{ providerKey: string; modelId: string; label: string }>) => {
    setServiceMappingDraft((prev) => {
      if (!prev) return prev;
      const list = [...(prev[section] || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], ...updates };
      return { ...prev, [section]: list };
    });
  };
  const addMappingEntry = (section: string) => {
    const providers = PROVIDERS_FOR_SECTION[section];
    const firstProvider = providers?.[0]?.key ?? 'openrouter';
    const firstModel = getModelsForSectionProvider(section, firstProvider)[0];
    const newEntry = {
      providerKey: firstProvider,
      modelId: firstModel?.id ?? '',
      label: firstModel?.label ?? '',
    };
    const list = [...(serviceMappingDraft?.[section] || []), newEntry];
    setServiceMappingDraft({ ...serviceMappingDraft!, [section]: list });
  };
  const removeMappingEntry = (section: string, index: number) => {
    if (!serviceMappingDraft) return;
    const list = (serviceMappingDraft[section] || []).filter((_, i) => i !== index);
    setServiceMappingDraft({ ...serviceMappingDraft, [section]: list });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle className="text-destructive">دسترسی محدود</CardTitle>
          <p className="text-muted-foreground mt-2">شما دسترسی به پنل مدیریت ندارید</p>
        </Card>
      </div>
    );
  }

  const handleAdjustCoins = async () => {
    if (!coinDialog || !coinAmount || !coinReason) return;
    setCoinLoading(true);
    try {
      await api.adjustUserCoins(coinDialog.id, parseInt(coinAmount), coinReason);
      toast.success('اعتبار تغییر کرد');
      setCoinDialog(null); setCoinAmount(''); setCoinReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setCoinLoading(false); }
  };

  const handleReconcileAll = async () => {
    setReconcileLoading(true);
    try {
      const result = await api.reconcileAll();
      if (result.inconsistent === 0) {
        toast.success(`همه ${result.totalUsers} کاربر صحیح هستند`);
      } else {
        toast.success(`${result.corrected} کاربر از ${result.inconsistent} مورد ناسازگار اصلاح شد`);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setReconcileLoading(false); }
  };

  const handleSaveSetting = async () => {
    if (!settingEditing) return;
    setSettingSaving(true);
    try {
      await api.updateAdminSetting(settingEditing.key, settingEditing.value);
      toast.success('تنظیم ذخیره شد');
      setSettingEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setSettingSaving(false); }
  };

  const openContractDialog = (org: any) => {
    setContractDialog(org);
    setContractEndsAt(org?.contractEndsAt ? org.contractEndsAt.slice(0, 10) : '');
    setCustomCoinQuota(org?.customCoinQuota != null ? String(org.customCoinQuota) : '');
    setContractPlan(org?.plan || 'FREE');
  };

  const handleSaveContract = async () => {
    if (!contractDialog) return;
    setContractSaving(true);
    try {
      await api.updateOrgContract(contractDialog.id, {
        contractEndsAt: contractEndsAt || null,
        customCoinQuota: customCoinQuota ? parseInt(customCoinQuota, 10) : null,
        plan: contractPlan,
      });
      toast.success('قرارداد به‌روز شد');
      setContractDialog(null);
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setContractSaving(false); }
  };

  const openEditUser = (u: any) => {
    setEditUserDialog(u);
  };

  const handleSaveUserEdit = async () => {
    if (!editUserDialog?.id) return;
    setUserEditSaving(true);
    try {
      const body: { name?: string; email?: string; role?: string; coins?: number; password?: string } = {
        name: userEditForm.name || undefined,
        email: userEditForm.email || undefined,
        role: userEditForm.role,
        coins: userEditForm.coins,
      };
      if (userEditForm.password.trim()) body.password = userEditForm.password;
      await api.updateAdminUser(editUserDialog.id, body);
      toast.success('کاربر به‌روز شد');
      setEditUserDialog(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setUserEditSaving(false); }
  };

  const handleSavePricing = async () => {
    setPricingSaving(true);
    try {
      const coinVal = parseInt(pricingCoinPrice, 10);
      if (!Number.isNaN(coinVal) && coinVal >= 0) await api.setAdminCoinPrice(coinVal);
      for (const service of ['text', 'image', 'tts', 'stt'] as const) {
        const costs: Record<string, number> = {};
        Object.entries(pricingModelCosts[service] || {}).forEach(([k, v]) => {
          const n = parseFloat(String(v));
          if (!Number.isNaN(n) && n >= 0) costs[k] = n;
        });
        if (Object.keys(costs).length) await api.setAdminModelCosts(service, costs);
      }
      toast.success('قیمت‌گذاری ذخیره شد');
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['admin-model-costs'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setPricingSaving(false); }
  };

  const openPackageDialog = (pkg?: any) => {
    setPackageDialog(pkg ? { pkg } : {});
    if (pkg) {
      setPackageForm({
        name: pkg.name ?? '',
        coins: String(pkg.coins ?? ''),
        priceIRR: String(pkg.priceIRR ?? ''),
        description: pkg.description ?? '',
        sortOrder: String(pkg.sortOrder ?? 0),
        discountPercent: String(pkg.discountPercent ?? 0),
        isActive: pkg.isActive !== false,
        packageType: pkg.packageType === 'ORGANIZATION' ? 'ORGANIZATION' : 'PERSONAL',
      });
    } else {
      setPackageForm({ name: '', coins: '', priceIRR: '', description: '', sortOrder: '0', discountPercent: '0', isActive: true, packageType: 'PERSONAL' });
    }
  };

  const handleSavePackage = async () => {
    if (!packageForm.name || !packageForm.coins || !packageForm.priceIRR) {
      toast.error('نام، تعداد سکه و مبلغ را وارد کنید');
      return;
    }
    setPackageSaving(true);
    try {
      const packageType = (packageForm.packageType === 'ORGANIZATION' ? 'ORGANIZATION' : 'PERSONAL') as 'PERSONAL' | 'ORGANIZATION';
      const body = {
        name: packageForm.name,
        coins: parseInt(packageForm.coins, 10),
        priceIRR: parseInt(packageForm.priceIRR, 10),
        description: packageForm.description || undefined,
        sortOrder: parseInt(packageForm.sortOrder, 10) || 0,
        discountPercent: parseFloat(packageForm.discountPercent) || 0,
        isActive: packageForm.isActive,
        packageType,
      };
      if (packageDialog?.pkg?.id) {
        const pkgId = packageDialog.pkg.id;
        await api.updateAdminPackage(pkgId, body);
        await api.updateAdminPackageType(pkgId, packageType);
        toast.success('بسته به‌روز شد');
      } else {
        await api.createAdminPackage(body);
        toast.success('بسته ایجاد شد');
      }
      setPackageDialog(null);
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setPackageSaving(false); }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('حذف این بسته؟')) return;
    try {
      await api.deleteAdminPackage(id);
      toast.success('بسته حذف شد');
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    } catch (err: any) { toast.error(err.message); }
  };

  const openDiscountCodeDialog = (dc?: any) => {
    setDiscountCodeDialog(dc ? { dc } : {});
    if (dc) {
      setDiscountCodeForm({
        code: dc.code ?? '',
        type: (dc.type === 'FIXED' ? 'FIXED' : 'PERCENT') as 'PERCENT' | 'FIXED',
        value: String(dc.value ?? ''),
        minOrderIRR: dc.minOrderIRR != null ? String(dc.minOrderIRR) : '',
        maxUses: dc.maxUses != null ? String(dc.maxUses) : '',
        validFrom: dc.validFrom ? dc.validFrom.slice(0, 16) : '',
        validTo: dc.validTo ? dc.validTo.slice(0, 16) : '',
        isActive: dc.isActive !== false,
      });
    } else {
      setDiscountCodeForm({ code: '', type: 'PERCENT', value: '', minOrderIRR: '', maxUses: '', validFrom: '', validTo: '', isActive: true });
    }
  };

  const handleSaveDiscountCode = async () => {
    if (!discountCodeForm.code.trim() || !discountCodeForm.value) {
      toast.error('کد و مقدار تخفیف را وارد کنید');
      return;
    }
    setDiscountCodeSaving(true);
    try {
      const body = {
        code: discountCodeForm.code.trim(),
        type: discountCodeForm.type,
        value: parseFloat(discountCodeForm.value) || 0,
        minOrderIRR: discountCodeForm.minOrderIRR ? parseInt(discountCodeForm.minOrderIRR, 10) : undefined,
        maxUses: discountCodeForm.maxUses ? parseInt(discountCodeForm.maxUses, 10) : undefined,
        validFrom: discountCodeForm.validFrom ? new Date(discountCodeForm.validFrom).toISOString() : undefined,
        validTo: discountCodeForm.validTo ? new Date(discountCodeForm.validTo).toISOString() : undefined,
        isActive: discountCodeForm.isActive,
      };
      if (discountCodeDialog?.dc?.id) {
        await api.updateAdminDiscountCode(discountCodeDialog.dc.id, body);
        toast.success('کد تخفیف به‌روز شد');
      } else {
        await api.createAdminDiscountCode(body);
        toast.success('کد تخفیف ایجاد شد');
      }
      setDiscountCodeDialog(null);
      queryClient.invalidateQueries({ queryKey: ['admin-discount-codes'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setDiscountCodeSaving(false); }
  };

  const handleDeleteDiscountCode = async (id: string) => {
    if (!confirm('حذف این کد تخفیف؟')) return;
    try {
      await api.deleteAdminDiscountCode(id);
      toast.success('کد تخفیف حذف شد');
      queryClient.invalidateQueries({ queryKey: ['admin-discount-codes'] });
    } catch (err: any) { toast.error(err.message); }
  };

  const statCards = [
    { label: 'کل کاربران', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500' },
    { label: 'کل تراکنش‌ها', value: stats?.totalTransactions || 0, icon: BarChart3, color: 'text-green-500' },
    { label: 'درآمد کل (سکه)', value: stats?.totalRevenue || 0, icon: Coins, color: 'text-yellow-500' },
    { label: 'فعال امروز', value: stats?.activeToday || 0, icon: Activity, color: 'text-purple-500' },
    { label: 'سکه در گردش', value: stats?.totalCoinsInCirculation || 0, icon: Database, color: 'text-orange-500' },
    { label: 'کل تولیدات', value: stats?.totalGenerations || 0, icon: Wrench, color: 'text-pink-500' },
  ];

  // Prepare chart data
  const chartDebits = (dailyStats || []).map((d: any) => d.debits);
  const chartCredits = (dailyStats || []).map((d: any) => d.credits);
  const chartTx = (dailyStats || []).map((d: any) => d.transactions);
  const maxDebit = Math.max(1, ...chartDebits);
  const maxCredit = Math.max(1, ...chartCredits);
  const maxTx = Math.max(1, ...chartTx);

  // Group settings by category
  const settingsGrouped = (settings || []).reduce((acc: Record<string, any[]>, s: any) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryLabels: Record<string, string> = {
    general: 'عمومی', billing: 'صورتحساب', memory: 'حافظه', provider: 'ارائه‌دهنده', menu: 'نمایش منوها',
  };

  const menuSettingKeys: { key: string; label: string }[] = [
    { key: 'menu_knowledge_enabled', label: 'پایگاه دانش' },
    { key: 'menu_workflows_enabled', label: 'ورک‌فلوها' },
    { key: 'menu_jobs_enabled', label: 'کارهای صف' },
    { key: 'menu_developer_enabled', label: 'مستندات API' },
  ];
  const getMenuEnabled = (key: string) => (settings || []).find((s: any) => s.key === key)?.value === 'true';
  const [menuUpdating, setMenuUpdating] = useState<string | null>(null);
  const handleMenuToggle = async (key: string, enabled: boolean) => {
    setMenuUpdating(key);
    try {
      await api.updateAdminSetting(key, enabled ? 'true' : 'false');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['menu-flags'] });
      toast.success(enabled ? 'منو فعال شد' : 'منو غیرفعال شد');
    } catch {
      toast.error('خطا در ذخیره');
    } finally {
      setMenuUpdating(null);
    }
  };

  const handleTicketReply = async () => {
    if (!selectedTicketId || !ticketReply.trim()) return;
    if (ticketReplyAttachment && !['image/png', 'image/jpeg', 'image/jpg'].includes(ticketReplyAttachment.type)) {
      toast.error('فقط PNG و JPG مجاز است');
      return;
    }
    setTicketReplySending(true);
    try {
      await api.replyAdminTicket(selectedTicketId, ticketReply.trim(), ticketReplyAttachment ?? undefined);
      setTicketReply('');
      setTicketReplyAttachment(null);
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('پاسخ ارسال شد');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTicketReplySending(false);
    }
  };

  const handleTicketStatusChange = async (ticketId: string, status: string) => {
    setTicketStatusUpdating(true);
    try {
      await api.updateAdminTicket(ticketId, { status });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin-ticket', ticketId] }),
        queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
      ]);
      toast.success('وضعیت به‌روز شد');
    } catch (err: any) {
      toast.error(err?.message || 'تغییر وضعیت انجام نشد');
    } finally {
      setTicketStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">پنل مدیریت</h1>
          <p className="text-muted-foreground mt-1">مدیریت، نظارت و تنظیمات سیستم</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReconcileAll} disabled={reconcileLoading}>
            {reconcileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ms-2">بازبینی کل</span>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-xl bg-[hsl(var(--glass-bg))] backdrop-blur-sm p-3 ${stat.color}`}><stat.icon className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {statsLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{formatNumber(stat.value)}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      {dailyStats && dailyStats.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">تراکنش‌های روزانه</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBarChart data={chartTx} maxVal={maxTx} color="bg-blue-500" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{dailyStats[0]?.date?.slice(5)}</span>
                <span>{dailyStats[dailyStats.length - 1]?.date?.slice(5)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">واریز روزانه (سکه)</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBarChart data={chartCredits} maxVal={maxCredit} color="bg-green-500" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{dailyStats[0]?.date?.slice(5)}</span>
                <span>{dailyStats[dailyStats.length - 1]?.date?.slice(5)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">مصرف روزانه (سکه)</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBarChart data={chartDebits} maxVal={maxDebit} color="bg-red-500" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{dailyStats[0]?.date?.slice(5)}</span>
                <span>{dailyStats[dailyStats.length - 1]?.date?.slice(5)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Stats */}
      {serviceStats && serviceStats.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">مصرف بر اساس سرویس</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {serviceStats.map((svc: any) => {
              const Icon = serviceIcons[svc.service] || BarChart3;
              const total = serviceStats.reduce((s: number, x: any) => s + x.totalAmount, 0);
              const pct = total > 0 ? Math.round((svc.totalAmount / total) * 100) : 0;
              return (
                <Card key={svc.service}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="font-medium capitalize">{svc.service}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{pct}%</Badge>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(svc.count)} بار</span>
                      <span>{formatNumber(svc.totalAmount)} سکه</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Provider Health */}
      {providersHealth && providersHealth.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">سلامت ارائه‌دهندگان</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {providersHealth.map((p: any) => (
              <Card key={p.providerId}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${p.status === 'healthy' ? 'bg-green-500' : p.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-x-3 space-x-reverse">
                      <span>تأخیر: {p.avgLatencyMs}ms</span>
                      <span>موفق: {p.successCount}</span>
                      <span>خطا: {p.errorCount}</span>
                    </div>
                  </div>
                  <Badge variant={p.status === 'healthy' ? 'default' : p.status === 'degraded' ? 'secondary' : 'destructive'}>
                    {p.status === 'healthy' ? 'سالم' : p.status === 'degraded' ? 'کند' : 'قطع'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Users / Settings / SLA / Audit / Export */}
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">کاربران</TabsTrigger>
          <TabsTrigger value="pricing">قیمت‌گذاری</TabsTrigger>
          <TabsTrigger value="packages">بسته‌ها</TabsTrigger>
          <TabsTrigger value="discount-codes">کد تخفیف</TabsTrigger>
          <TabsTrigger value="ai-services">سرویس‌های هوش مصنوعی</TabsTrigger>
          <TabsTrigger value="settings">تنظیمات سیستم</TabsTrigger>
          <TabsTrigger value="logos">لوگوها</TabsTrigger>
          <TabsTrigger value="tickets">تیکت‌های پشتیبانی</TabsTrigger>
          <TabsTrigger value="sla">وضعیت SLA</TabsTrigger>
          <TabsTrigger value="audit">لاگ تغییرات</TabsTrigger>
          <TabsTrigger value="contracts">قراردادهای سازمانی</TabsTrigger>
          <TabsTrigger value="export">خروجی</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجوی ایمیل یا نام..." value={search} onChange={(e) => { setSearch(e.target.value); setUserPage(1); }} className="ps-9" />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setUserPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="نقش" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="ADMIN">مدیر</SelectItem>
                <SelectItem value="USER">کاربر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {usersLoading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[hsl(var(--glass-border-subtle))] bg-[hsl(var(--glass-bg))]">
                      <th className="p-3 text-right font-medium">نام</th>
                      <th className="p-3 text-right font-medium">ایمیل</th>
                      <th className="p-3 text-right font-medium">نقش</th>
                      <th className="p-3 text-right font-medium">اعتبار</th>
                      <th className="p-3 text-right font-medium">تاریخ عضویت</th>
                      <th className="p-3 text-right font-medium">عملیات</th>
                    </tr></thead>
                    <tbody>
                      {usersData?.users?.map((u: any) => (
                        <tr key={u.id} className="border-b border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))] transition-colors">
                          <td className="p-3">{u.name || '-'}</td>
                          <td className="p-3" dir="ltr">{u.email}</td>
                          <td className="p-3"><Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>{u.role === 'ADMIN' ? 'مدیر' : 'کاربر'}</Badge></td>
                          <td className="p-3">{formatNumber(u.coins)} سکه</td>
                          <td className="p-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                          <td className="p-3 flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditUser(u)}><Pencil className="h-3.5 w-3.5 me-1" /> ویرایش</Button>
                            <Button variant="outline" size="sm" onClick={() => setCoinDialog(u)}>تغییر اعتبار</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {usersData?.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4">
                      <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}>قبلی</Button>
                      <span className="text-sm text-muted-foreground">صفحه {userPage} از {usersData.totalPages}</span>
                      <Button variant="outline" size="sm" disabled={userPage >= usersData.totalPages} onClick={() => setUserPage(p => p + 1)}>بعدی</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">قیمت هر سکه (ریال)</CardTitle>
              <CardDescription>مبلغ به ازای هر سکه برای محاسبات</CardDescription>
            </CardHeader>
            <CardContent className="flex items-end gap-4">
              <div className="space-y-2 max-w-xs">
                <Label>قیمت (IRR)</Label>
                <Input type="number" min="0" value={pricingCoinPrice} onChange={(e) => setPricingCoinPrice(e.target.value)} dir="ltr" placeholder="مثلاً 100" />
              </div>
              <Button onClick={handleSavePricing} disabled={pricingSaving}>
                {pricingSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                ذخیره
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">هزینه مدل‌ها (سکه به ازای هر درخواست)</CardTitle>
              <CardDescription>متنی، تصویری، TTS، STT</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const sectionLabels: Record<string, string> = {
                  chat: 'چت',
                  text: 'مدل‌های متنی',
                  image: 'مدل‌های تصویری',
                  video: 'ویدیو',
                  tts: 'تبدیل متن به گفتار',
                  stt: 'تشخیص گفتار',
                };
                const sectionsWithMapping = (Object.keys(serviceMappingData || {}) as (keyof typeof serviceMappingData)[]).filter(
                  (s) => Array.isArray((serviceMappingData as any)?.[s]) && (serviceMappingData as any)[s].length > 0
                );
                const sections = sectionsWithMapping.length ? sectionsWithMapping : (['chat', 'text', 'image', 'video', 'tts', 'stt'] as const);
                const savableSections = ['text', 'image', 'tts', 'stt'] as const;
                return sections.map((service) => {
                  const costs = pricingModelCosts[service] || {};
                  const mappingEntries = (serviceMappingData as any)?.[service] || [];
                  const fromMapping = mappingEntries.map((e: { modelId: string }) => e.modelId);
                  const fromCosts = adminModelCosts?.[service] && typeof adminModelCosts[service] === 'object' ? Object.keys(adminModelCosts[service] as object) : [];
                  const uniq = Array.from(new Set([...fromMapping, ...fromCosts, ...Object.keys(costs)].filter(Boolean)));
                  const canSave = savableSections.includes(service as any);
                  const label = sectionLabels[service] || service;
                  return (
                    <div key={service}>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        {label}
                        {!canSave && <Badge variant="secondary" className="text-[10px]">فقط نمایش</Badge>}
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {uniq.map((modelId) => {
                          const entry = mappingEntries.find((e: { modelId: string }) => e.modelId === modelId);
                          const displayLabel = (entry as { label?: string })?.label || modelId;
                          return (
                            <div key={modelId} className="flex items-center gap-2">
                              <Label className="shrink-0 w-32 truncate text-xs font-mono" dir="ltr" title={modelId}>{displayLabel}</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-20"
                                dir="ltr"
                                value={costs[modelId] ?? ''}
                                onChange={(e) => setPricingModelCosts((prev) => ({ ...prev, [service]: { ...(prev[service] || {}), [modelId]: e.target.value } }))}
                                disabled={!canSave}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
              <Button onClick={handleSavePricing} disabled={pricingSaving}>
                {pricingSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                ذخیره هزینه مدل‌ها
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openPackageDialog()}><Plus className="h-4 w-4 me-2" /> افزودن بسته</Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {!adminPackages?.length ? (
                <p className="text-center text-muted-foreground py-8">بسته‌ای تعریف نشده</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-3 text-right font-medium">نام</th>
                    <th className="p-3 text-right font-medium">نوع پلن</th>
                    <th className="p-3 text-right font-medium">سکه</th>
                    <th className="p-3 text-right font-medium">قیمت (ریال)</th>
                    <th className="p-3 text-right font-medium">تخفیف %</th>
                    <th className="p-3 text-right font-medium">فعال</th>
                    <th className="p-3 text-right font-medium">عملیات</th>
                  </tr></thead>
                  <tbody>
                    {adminPackages.map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{p.name}</td>
                        <td className="p-3">
                          <Badge variant={p.packageType === 'ORGANIZATION' ? 'default' : 'secondary'}>
                            {p.packageType === 'ORGANIZATION' ? 'پلن سازمانی' : 'پلن عادی'}
                          </Badge>
                        </td>
                        <td className="p-3">{formatNumber(p.coins)}</td>
                        <td className="p-3" dir="ltr">{formatNumber(p.priceIRR)}</td>
                        <td className="p-3">{p.discountPercent ?? 0}%</td>
                        <td className="p-3">{p.isActive !== false ? 'بله' : 'خیر'}</td>
                        <td className="p-3 flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openPackageDialog(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeletePackage(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discount Codes Tab */}
        <TabsContent value="discount-codes" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openDiscountCodeDialog()}><Plus className="h-4 w-4 me-2" /> افزودن کد تخفیف</Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {!discountCodesData?.items?.length ? (
                <p className="text-center text-muted-foreground py-8">کد تخفیفی ثبت نشده</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50">
                      <th className="p-3 text-right font-medium">کد</th>
                      <th className="p-3 text-right font-medium">نوع</th>
                      <th className="p-3 text-right font-medium">مقدار</th>
                      <th className="p-3 text-right font-medium">حداقل سفارش</th>
                      <th className="p-3 text-right font-medium">استفاده</th>
                      <th className="p-3 text-right font-medium">فعال</th>
                      <th className="p-3 text-right font-medium">عملیات</th>
                    </tr></thead>
                    <tbody>
                      {discountCodesData.items.map((d: any) => (
                        <tr key={d.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono">{d.code}</td>
                          <td className="p-3">{d.type === 'FIXED' ? 'مبلغ ثابت' : 'درصد'}</td>
                          <td className="p-3" dir="ltr">{d.type === 'FIXED' ? formatNumber(d.value) : `${d.value}%`}</td>
                          <td className="p-3" dir="ltr">{d.minOrderIRR != null ? formatNumber(d.minOrderIRR) : '-'}</td>
                          <td className="p-3">{d.usedCount ?? 0} / {d.maxUses ?? '∞'}</td>
                          <td className="p-3">{d.isActive !== false ? 'بله' : 'خیر'}</td>
                          <td className="p-3 flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openDiscountCodeDialog(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDiscountCode(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {discountCodesData.totalPages > 1 && (
                    <div className="flex justify-center gap-2 p-4">
                      <Button variant="outline" size="sm" disabled={discountCodePage <= 1} onClick={() => setDiscountCodePage((p) => p - 1)}>قبلی</Button>
                      <span className="text-sm text-muted-foreground">صفحه {discountCodePage} از {discountCodesData.totalPages}</span>
                      <Button variant="outline" size="sm" disabled={discountCodePage >= discountCodesData.totalPages} onClick={() => setDiscountCodePage((p) => p + 1)}>بعدی</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Services Tab: providers + service mapping */}
        <TabsContent value="ai-services" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-5 w-5" /> ارائه‌دهندگان و API Key</CardTitle>
              <CardDescription>ارائه‌دهندگان را فعال کنید، API Key وارد کنید و اتصال را تست کنید. پس از اتصال در سلامت ارائه‌دهندگان نمایش داده می‌شوند.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {!aiProvidersList?.length ? (
                <p className="text-center text-muted-foreground py-8">در حال بارگذاری...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-3 text-right font-medium">سرویس</th>
                    <th className="p-3 text-right font-medium">دسته</th>
                    <th className="p-3 text-right font-medium">API Key</th>
                    <th className="p-3 text-right font-medium">وضعیت</th>
                    <th className="p-3 text-right font-medium">عملیات</th>
                  </tr></thead>
                  <tbody>
                    {(aiProvidersList as any[]).map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{p.displayName}</td>
                        <td className="p-3 text-muted-foreground">{p.category}</td>
                        <td className="p-3">{p.hasApiKey ? <Badge variant="secondary"><Key className="h-3 w-3 me-1" /> تنظیم شده</Badge> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-3">{p.isEnabled ? <Badge variant="default"><CheckCircle2 className="h-3 w-3 me-1" /> فعال</Badge> : <Badge variant="outline"><XCircle className="h-3 w-3 me-1" /> غیرفعال</Badge>}</td>
                        <td className="p-3">
                          <Button variant="outline" size="sm" onClick={() => openProviderEdit(p)}><Pencil className="h-3.5 w-3.5 me-1" /> ویرایش</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">نقشه سرویس‌ها</CardTitle>
              <CardDescription>مشخص کنید هر بخش سایت (چت، متنی، تصویر، ویدیو، صوتی) با کدام ارائه‌دهنده و مدل کار کند. مثلاً چت با GPT از OpenRouter و Grok با API مستقیم.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {serviceMappingDraft && (
                <>
                  {(['chat', 'text', 'image', 'video', 'tts', 'stt'] as const).map((section) => {
                    const sectionLabels: Record<string, string> = { chat: 'چت هوشمند', text: 'متنی', image: 'تصویر', video: 'ویدیو', tts: 'تبدیل متن به گفتار', stt: 'تشخیص گفتار' };
                    const list = serviceMappingDraft[section] || [];
                    const baseProviders = PROVIDERS_FOR_SECTION[section] || [];
                    const providerKeysInList = new Set(list.map((e) => e.providerKey).filter(Boolean));
                    const extraProviders = Array.from(providerKeysInList).filter((k) => !baseProviders.some((p) => p.key === k)).map((key) => ({ key, name: `${key} (ذخیره‌شده)` }));
                    const providerOptions = [...baseProviders, ...extraProviders];
                    return (
                      <div key={section}>
                        <h4 className="text-sm font-medium mb-2">{sectionLabels[section]}</h4>
                        <div className="space-y-2">
                          {list.map((entry, idx) => {
                            const modelOptions = getModelsForSectionProvider(section, entry.providerKey || '');
                            const hasCustomModel = entry.modelId && !modelOptions.some((m) => m.id === entry.modelId);
                            const options = hasCustomModel
                              ? [...modelOptions, { id: entry.modelId!, label: `${entry.modelId} (سفارشی)` }]
                              : modelOptions;
                            const selectedModelLabel = (modelOptions.find((m) => m.id === entry.modelId) ?? options.find((m) => m.id === entry.modelId))?.label;
                            return (
                              <div key={idx} className="flex flex-wrap items-center gap-2">
                                <Select
                                  value={entry.providerKey || ''}
                                  onValueChange={(v) => {
                                    const first = getModelsForSectionProvider(section, v)[0];
                                    updateMappingEntryBatch(section, idx, {
                                      providerKey: v,
                                      modelId: first?.id ?? '',
                                      label: first?.label ?? '',
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="ارائه‌دهنده" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {providerOptions.map((p) => (
                                      <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={entry.modelId || ''}
                                  onValueChange={(v) => {
                                    const opt = options.find((m) => m.id === v);
                                    updateMappingEntryBatch(section, idx, {
                                      modelId: v,
                                      label: opt?.label ?? entry.label ?? '',
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="مدل" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.map((m) => (
                                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="برچسب (اختیاری)"
                                  className="w-32 text-xs"
                                  value={entry.label ?? selectedModelLabel ?? ''}
                                  onChange={(e) => updateMappingEntry(section, idx, 'label', e.target.value)}
                                />
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMappingEntry(section, idx)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            );
                          })}
                          <Button variant="outline" size="sm" onClick={() => addMappingEntry(section)}><Plus className="h-4 w-4 me-1" /> افزودن مدل</Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button onClick={handleSaveServiceMapping} disabled={serviceMappingSaving}>
                    {serviceMappingSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    ذخیره نقشه سرویس‌ها
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">نمایش منوها</CardTitle>
              <CardDescription>تعیین کنید کدام منوها در سایدبار و داشبورد برای کاربران نمایش داده شوند.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {menuSettingKeys.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-[hsl(var(--glass-border-subtle))] last:border-0">
                  <Label htmlFor={key} className="text-sm font-medium cursor-pointer flex-1">{label}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={getMenuEnabled(key) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleMenuToggle(key, true)}
                      disabled={menuUpdating === key}
                    >
                      {menuUpdating === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'فعال'}
                    </Button>
                    <Button
                      variant={!getMenuEnabled(key) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleMenuToggle(key, false)}
                      disabled={menuUpdating === key}
                    >
                      غیرفعال
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          {Object.entries(settingsGrouped).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base">{categoryLabels[category] || category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(items as any[]).map((s: any) => (
                  <div key={s.key} className="flex items-center justify-between gap-4 py-2 border-b border-[hsl(var(--glass-border-subtle))] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-mono" dir="ltr">{s.key}</p>
                      {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded" dir="ltr">{s.value}</code>
                      <Button variant="ghost" size="sm" onClick={() => setSettingEditing({ key: s.key, value: s.value })}>
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Logos Tab — لوگوها و نمادک برای سایت و PWA */}
        <TabsContent value="logos" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIconLucide className="h-5 w-5" />
                لوگوها و نمادک سایت
              </CardTitle>
              <CardDescription>برای هر بخش تصویر را با اندازهٔ پیشنهادی آپلود کنید. در تب مرورگر، نصب PWA و هدر سایت از همین تصاویر استفاده می‌شود.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'favicon', label: 'نمادک سایت (فاویکون)', size: '32×32', desc: 'تب مرورگر', urlKey: 'favicon' as const },
                { key: 'appleTouchIcon', label: 'آیکون اپل (اضافه به صفحهٔ اصلی)', size: '180×180', desc: 'iOS / افزودن به صفحهٔ اصلی', urlKey: 'appleTouchIcon' as const },
                { key: 'pwa192', label: 'آیکون PWA کوچک', size: '192×192', desc: 'نمایش در نوار وظیفه و منو', urlKey: 'pwa192' as const },
                { key: 'pwa512', label: 'آیکون PWA بزرگ', size: '512×512', desc: 'نصب اپلیکیشن و اسپلش', urlKey: 'pwa512' as const },
                { key: 'logo', label: 'لوگو هدر و سایدبار', size: '64×64 یا 128×128', desc: 'نمایش در هدر، سایدبار و صفحهٔ ورود', urlKey: 'logo' as const },
              ].map(({ key, label, size, desc, urlKey }) => (
                <div key={key} className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex flex-col items-center gap-2 min-w-[100px]">
                    {branding?.[urlKey] ? (
                      <img src={`${branding[urlKey]}?t=${Date.now()}`} alt={label} className="w-16 h-16 object-contain rounded-lg border border-border bg-background" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center">
                        <ImageIconLucide className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground text-center">{size}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/png,image/x-icon,image/ico,.ico"
                      className="hidden"
                      id={`logo-${key}`}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLogoUploading(key);
                        try {
                          await api.uploadBranding(key, file);
                          await refetchBranding();
                          toast.success(`${label} با موفقیت آپلود شد`);
                        } catch (err: any) {
                          toast.error(err?.message || 'خطا در آپلود');
                        } finally {
                          setLogoUploading(null);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Label htmlFor={`logo-${key}`} className="cursor-pointer">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
                          logoUploading === key && 'opacity-70'
                        )}
                      >
                        {logoUploading === key ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" /> : <Upload className="h-3.5 w-3.5 me-1" />}
                        آپلود
                      </span>
                    </Label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tickets Tab — پاسخگویی به پیام‌های کاربران */}
        <TabsContent value="tickets" className="mt-4 space-y-4">
          <p className="text-muted-foreground text-sm">پیام‌هایی که کاربران ارسال کرده‌اند در اینجا نمایش داده می‌شوند. تیکتی انتخاب کنید و پاسخ دهید.</p>
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={ticketStatusFilter || 'all'} onValueChange={(v) => { setTicketStatusFilter(v === 'all' ? '' : v); setTicketPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="IN_PROGRESS">در حال بررسی</SelectItem>
                <SelectItem value="SUPPORT_REPLIED">پاسخ پشتیبانی</SelectItem>
                <SelectItem value="CUSTOMER_REPLIED">پاسخ مشتری</SelectItem>
                <SelectItem value="CLOSED">بسته</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ticketCategoryFilter || 'all'} onValueChange={(v) => { setTicketCategoryFilter(v === 'all' ? '' : v); setTicketPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="دسته‌بندی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دسته‌ها</SelectItem>
                <SelectItem value="CONSULTING_SALES">مشاوره و فروش</SelectItem>
                <SelectItem value="TECHNICAL">فنی</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">لیست تیکت‌ها</CardTitle>
                <CardDescription>تیکت‌های ارسالی کاربران — یکی را انتخاب کنید و پاسخ دهید</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!ticketsData?.items?.length ? (
                  <p className="text-center text-muted-foreground py-8">تیکتی یافت نشد</p>
                ) : (
                  <ul className="divide-y divide-border max-h-[400px] overflow-y-auto">
                    {(ticketsData.items as any[]).map((t: any) => (
                      <li
                        key={t.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 ${selectedTicketId === t.id ? 'bg-primary/10' : ''}`}
                        onClick={() => setSelectedTicketId(t.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate text-sm">{t.subject}</span>
                          <Badge variant={t.status === 'CLOSED' ? 'secondary' : 'default'} className="shrink-0">
                            {t.status === 'IN_PROGRESS' ? 'در حال بررسی' : t.status === 'SUPPORT_REPLIED' ? 'پاسخ پشتیبانی' : t.status === 'CUSTOMER_REPLIED' ? 'پاسخ مشتری' : 'بسته'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{t.user?.email}</span>
                          <Badge variant="outline" className="text-xs">{t.category === 'TECHNICAL' ? 'فنی' : 'مشاوره و فروش'}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {ticketsData && ticketsData.totalPages > 1 && (
                  <div className="flex justify-between p-3 border-t">
                    <Button variant="outline" size="sm" disabled={ticketPage <= 1} onClick={() => setTicketPage((p) => p - 1)}>قبلی</Button>
                    <span className="text-sm text-muted-foreground">صفحه {ticketPage} از {ticketsData.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={ticketPage >= ticketsData.totalPages} onClick={() => setTicketPage((p) => p + 1)}>بعدی</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">مشاهده و پاسخ به کاربر</CardTitle>
                {selectedTicket && (
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(v) => handleTicketStatusChange(selectedTicket.id, v)}
                    disabled={ticketStatusUpdating}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="وضعیت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_PROGRESS">در حال بررسی</SelectItem>
                      <SelectItem value="SUPPORT_REPLIED">پاسخ پشتیبانی</SelectItem>
                      <SelectItem value="CUSTOMER_REPLIED">پاسخ مشتری</SelectItem>
                      <SelectItem value="CLOSED">بسته</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedTicket ? (
                  <p className="text-muted-foreground text-sm">یک تیکت را انتخاب کنید</p>
                ) : (
                  <>
                    <div className="pb-2 border-b">
                      <p className="text-sm font-medium">{selectedTicket.subject}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{selectedTicket.user?.name} — {selectedTicket.user?.email}</span>
                        <Badge variant="outline" className="text-xs">{(selectedTicket as any).category === 'TECHNICAL' ? 'فنی' : 'مشاوره و فروش'}</Badge>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto">
                      {(selectedTicket.messages as any[])?.map((msg: any) => (
                        <div key={msg.id} className={`rounded-xl p-3 text-sm ${msg.isStaff ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-transparent'}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium">{msg.isStaff ? 'پشتیبانی' : msg.author?.name}</span>
                            <span className="text-muted-foreground text-xs">{formatDate(msg.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.attachmentUrl && (
                            <AdminTicketAttachmentImg ticketId={selectedTicket.id} attachmentUrl={msg.attachmentUrl} />
                          )}
                        </div>
                      ))}
                    </div>
                    {selectedTicket.status !== 'CLOSED' && (
                      <div className="space-y-3 pt-3 border-t">
                        <textarea
                          placeholder="پاسخ پشتیبانی..."
                          value={ticketReply}
                          onChange={(e) => setTicketReply(e.target.value)}
                          rows={3}
                          className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                        />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">پیوست تصویر (اختیاری): PNG، JPG</p>
                          <Input
                            type="file"
                            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                            className="max-w-xs"
                            onChange={(e) => setTicketReplyAttachment(e.target.files?.[0] ?? null)}
                          />
                          {ticketReplyAttachment && <span className="text-xs text-muted-foreground ms-2">{ticketReplyAttachment.name}</span>}
                        </div>
                        <Button size="sm" onClick={handleTicketReply} disabled={ticketReplySending || !ticketReply.trim()}>
                          {ticketReplySending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          <span className="ms-2">ارسال پاسخ</span>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SLA Tab */}
        <TabsContent value="sla" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">وضعیت فعلی SLA</CardTitle>
                <CardDescription>بر اساس نرخ موفقیت درخواست‌ها و تأخیر P95</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {slaStatus ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant={slaStatus.status === 'OK' ? 'default' : slaStatus.status === 'DEGRADED' ? 'secondary' : 'destructive'}>
                        {slaStatus.status === 'OK' ? 'در حد هدف' : slaStatus.status === 'DEGRADED' ? 'کاهش کیفیت' : 'خارج از هدف'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{slaStatus.message}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">نرخ موفقیت</p>
                        <p className="font-medium">{slaStatus.uptime?.currentPercent ?? '-'}% (هدف: {slaStatus.uptime?.targetPercent ?? '-'}%)</p>
                        {slaStatus.uptime?.ok !== undefined && <span className={slaStatus.uptime.ok ? 'text-green-600' : 'text-destructive'}>{slaStatus.uptime.ok ? '✓' : '✗'}</span>}
                      </div>
                      <div>
                        <p className="text-muted-foreground">تأخیر P95</p>
                        <p className="font-medium">{slaStatus.latency?.p95Ms ?? '-'} ms (حداکثر: {slaStatus.latency?.targetMaxMs ?? '-'} ms)</p>
                        {slaStatus.latency?.ok !== undefined && <span className={slaStatus.latency.ok ? 'text-green-600' : 'text-destructive'}>{slaStatus.latency.ok ? '✓' : '✗'}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">ارزیابی: {slaStatus.evaluatedAt}</p>
                  </>
                ) : (
                  <Skeleton className="h-24 w-full" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">اهداف SLA</CardTitle>
                <CardDescription>از تنظیمات سیستم (sla_uptime_target_percent, sla_p95_max_ms)</CardDescription>
              </CardHeader>
              <CardContent>
                {slaTargets ? (
                  <dl className="space-y-2 text-sm">
                    <div><dt className="text-muted-foreground">حداقل نرخ موفقیت (٪)</dt><dd className="font-mono">{slaTargets.uptimePercentMin}</dd></div>
                    <div><dt className="text-muted-foreground">حداکثر تأخیر P95 (ms)</dt><dd className="font-mono">{slaTargets.p95LatencyMsMax}</dd></div>
                  </dl>
                ) : (
                  <Skeleton className="h-16 w-full" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="mt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <Input
              placeholder="فیلتر عملیات (مثلاً LOGIN)"
              value={auditAction}
              onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
              className="max-w-[180px]"
            />
            <Input
              placeholder="فیلتر موجودیت (مثلاً User)"
              value={auditEntity}
              onChange={(e) => { setAuditEntity(e.target.value); setAuditPage(1); }}
              className="max-w-[180px]"
            />
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {!auditData?.logs?.length ? (
                <p className="text-center text-muted-foreground py-8">لاگی ثبت نشده</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[hsl(var(--glass-border-subtle))] bg-[hsl(var(--glass-bg))]">
                      <th className="p-3 text-right font-medium">عملیات</th>
                      <th className="p-3 text-right font-medium">موجودیت</th>
                      <th className="p-3 text-right font-medium">جزئیات</th>
                      <th className="p-3 text-right font-medium">تاریخ</th>
                    </tr></thead>
                    <tbody>
                      {auditData.logs.map((log: any) => (
                        <tr key={log.id} className="border-b border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))] transition-colors">
                          <td className="p-3"><Badge variant="secondary" className="text-[10px] font-mono">{log.action}</Badge></td>
                          <td className="p-3 text-xs">{log.entity} {log.entityId ? `(${log.entityId.slice(0, 8)}...)` : ''}</td>
                          <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                            {log.details ? JSON.stringify(log.details).slice(0, 80) : '-'}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">{formatDate(log.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {auditData.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4">
                      <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}>قبلی</Button>
                      <span className="text-sm text-muted-foreground">صفحه {auditPage} از {auditData.totalPages}</span>
                      <Button variant="outline" size="sm" disabled={auditPage >= auditData.totalPages} onClick={() => setAuditPage(p => p + 1)}>بعدی</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations / Contracts Tab */}
        <TabsContent value="contracts" className="mt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجوی نام سازمان..." value={orgSearch} onChange={(e) => { setOrgSearch(e.target.value); setOrgPage(1); }} className="ps-9" />
            </div>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {!orgsData?.organizations?.length ? (
                <p className="text-center text-muted-foreground py-8">سازمانی یافت نشد</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[hsl(var(--glass-border-subtle))] bg-[hsl(var(--glass-bg))]">
                      <th className="p-3 text-right font-medium">سازمان</th>
                      <th className="p-3 text-right font-medium">پلن</th>
                      <th className="p-3 text-right font-medium">پایان قرارداد</th>
                      <th className="p-3 text-right font-medium">سقف سکه</th>
                      <th className="p-3 text-right font-medium">اعضا</th>
                      <th className="p-3 text-right font-medium">عملیات</th>
                    </tr></thead>
                    <tbody>
                      {orgsData.organizations.map((o: any) => (
                        <tr key={o.id} className="border-b border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))] transition-colors">
                          <td className="p-3"><span className="font-medium">{o.name}</span><br /><span className="text-xs text-muted-foreground font-mono">{o.slug}</span></td>
                          <td className="p-3"><Badge variant="secondary">{o.plan}</Badge></td>
                          <td className="p-3 text-muted-foreground">{o.contractEndsAt ? formatDate(o.contractEndsAt) : '-'}</td>
                          <td className="p-3">{o.customCoinQuota != null ? formatNumber(o.customCoinQuota) : '-'}</td>
                          <td className="p-3">{o.membersCount ?? 0}</td>
                          <td className="p-3">
                            <Button variant="outline" size="sm" onClick={() => openContractDialog(o)}>
                              <FileSignature className="h-3.5 w-3.5 me-1" /> قرارداد
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orgsData.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4">
                      <Button variant="outline" size="sm" disabled={orgPage <= 1} onClick={() => setOrgPage(p => p - 1)}>قبلی</Button>
                      <span className="text-sm text-muted-foreground">صفحه {orgPage} از {orgsData.totalPages}</span>
                      <Button variant="outline" size="sm" disabled={orgPage >= orgsData.totalPages} onClick={() => setOrgPage(p => p + 1)}>بعدی</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">خروجی کاربران</CardTitle>
                <CardDescription>دانلود لیست کاربران به فرمت CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => window.open(api.exportUsersUrl(), '_blank')}>
                  <Download className="h-4 w-4 me-2" /> دانلود CSV کاربران
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">خروجی تراکنش‌ها</CardTitle>
                <CardDescription>دانلود تراکنش‌ها به فرمت CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => window.open(api.exportTransactionsUrl(), '_blank')}>
                  <Download className="h-4 w-4 me-2" /> دانلود CSV تراکنش‌ها
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">خروجی لاگ ممیزی</CardTitle>
                <CardDescription>دانلود لاگ تغییرات به CSV یا JSON</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(api.exportAuditLogsUrl('csv'), '_blank')}>
                  <Download className="h-4 w-4 me-2" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(api.exportAuditLogsUrl('json'), '_blank')}>
                  <Download className="h-4 w-4 me-2" /> JSON
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Contract Edit Dialog */}
      <Dialog open={!!contractDialog} onOpenChange={() => setContractDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش قرارداد سازمان</DialogTitle>
            <DialogDescription>{contractDialog?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>پلن</Label>
              <Select value={contractPlan} onValueChange={setContractPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">FREE</SelectItem>
                  <SelectItem value="PRO">PRO</SelectItem>
                  <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاریخ پایان قرارداد (خالی = بدون انقضا)</Label>
              <Input type="date" value={contractEndsAt} onChange={(e) => setContractEndsAt(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>سقف سکه سازمان (خالی = نامحدود)</Label>
              <Input type="number" min="0" value={customCoinQuota} onChange={(e) => setCustomCoinQuota(e.target.value)} placeholder="مثلاً 10000" dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialog(null)}>انصراف</Button>
            <Button onClick={handleSaveContract} disabled={contractSaving}>
              {contractSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coin Adjustment Dialog */}
      <Dialog open={!!coinDialog} onOpenChange={() => setCoinDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغییر اعتبار کاربر</DialogTitle>
            <DialogDescription>مقدار و دلیل تغییر اعتبار کاربر را وارد کنید</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">کاربر: {coinDialog?.name || coinDialog?.email}</p>
            <p className="text-sm">اعتبار فعلی: <strong>{formatNumber(coinDialog?.coins || 0)} سکه</strong></p>
            <div className="space-y-2">
              <Label>مقدار (مثبت = واریز، منفی = برداشت)</Label>
              <Input type="number" value={coinAmount} onChange={(e) => setCoinAmount(e.target.value)} placeholder="مثلاً 100 یا -50" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>دلیل</Label>
              <Input value={coinReason} onChange={(e) => setCoinReason(e.target.value)} placeholder="دلیل تغییر اعتبار" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoinDialog(null)}>انصراف</Button>
            <Button onClick={handleAdjustCoins} disabled={coinLoading || !coinAmount || !coinReason}>
              {coinLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              اعمال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setting Edit Dialog */}
      <Dialog open={!!settingEditing} onOpenChange={() => setSettingEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش تنظیم</DialogTitle>
            <DialogDescription dir="ltr">{settingEditing?.key}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>مقدار</Label>
              <Input
                value={settingEditing?.value || ''}
                onChange={(e) => setSettingEditing(s => s ? { ...s, value: e.target.value } : null)}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingEditing(null)}>انصراف</Button>
            <Button onClick={handleSaveSetting} disabled={settingSaving}>
              {settingSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Edit Dialog */}
      <Dialog open={!!editUserDialog} onOpenChange={(open) => !open && setEditUserDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش کاربر</DialogTitle>
            <DialogDescription>{editUserDialog?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input value={userEditForm.name} onChange={(e) => setUserEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input type="email" dir="ltr" value={userEditForm.email} onChange={(e) => setUserEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>نقش</Label>
              <Select value={userEditForm.role} onValueChange={(v) => setUserEditForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">کاربر</SelectItem>
                  <SelectItem value="ADMIN">مدیر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اعتبار (سکه)</Label>
              <Input type="number" dir="ltr" value={userEditForm.coins} onChange={(e) => setUserEditForm((f) => ({ ...f, coins: parseInt(e.target.value, 10) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>رمز عبور جدید (اختیاری)</Label>
              <Input type="password" dir="ltr" placeholder="خالی = بدون تغییر" value={userEditForm.password} onChange={(e) => setUserEditForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialog(null)}>انصراف</Button>
            <Button onClick={handleSaveUserEdit} disabled={userEditSaving}>
              {userEditSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Add/Edit Dialog */}
      <Dialog open={!!packageDialog} onOpenChange={() => setPackageDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{packageDialog?.pkg ? 'ویرایش بسته' : 'افزودن بسته'}</DialogTitle>
            <DialogDescription>
              {packageDialog?.pkg ? 'اطلاعات بسته خرید را ویرایش کنید.' : 'بسته جدید با نام، سکه و قیمت تعریف کنید.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input value={packageForm.name} onChange={(e) => setPackageForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً بسته طلایی" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تعداد سکه</Label>
                <Input type="number" min="1" dir="ltr" value={packageForm.coins} onChange={(e) => setPackageForm((f) => ({ ...f, coins: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>قیمت (ریال)</Label>
                <Input type="number" min="0" dir="ltr" value={packageForm.priceIRR} onChange={(e) => setPackageForm((f) => ({ ...f, priceIRR: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>توضیح (اختیاری)</Label>
              <Input value={packageForm.description} onChange={(e) => setPackageForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ترتیب نمایش</Label>
                <Input type="number" dir="ltr" value={packageForm.sortOrder} onChange={(e) => setPackageForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>درصد تخفیف بسته</Label>
                <Input type="number" min="0" max="100" step="0.1" dir="ltr" value={packageForm.discountPercent} onChange={(e) => setPackageForm((f) => ({ ...f, discountPercent: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>نوع پلن</Label>
              <Select value={packageForm.packageType} onValueChange={(v) => setPackageForm((f) => ({ ...f, packageType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">پلن عادی</SelectItem>
                  <SelectItem value="ORGANIZATION">پلن سازمانی (فعال‌سازی بخش سازمان‌ها)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pkg-active" checked={packageForm.isActive} onChange={(e) => setPackageForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              <Label htmlFor="pkg-active">فعال</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackageDialog(null)}>انصراف</Button>
            <Button onClick={handleSavePackage} disabled={packageSaving}>
              {packageSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Code Add/Edit Dialog */}
      <Dialog open={!!discountCodeDialog} onOpenChange={() => setDiscountCodeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{discountCodeDialog?.dc ? 'ویرایش کد تخفیف' : 'افزودن کد تخفیف'}</DialogTitle>
            <DialogDescription>
              {discountCodeDialog?.dc ? 'مشخصات کد تخفیف را ویرایش کنید.' : 'کد تخفیف جدید با نوع و مقدار تعریف کنید.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>کد</Label>
              <Input dir="ltr" value={discountCodeForm.code} onChange={(e) => setDiscountCodeForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="مثلاً WELCOME20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع</Label>
                <Select value={discountCodeForm.type} onValueChange={(v: 'PERCENT' | 'FIXED') => setDiscountCodeForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">درصد</SelectItem>
                    <SelectItem value="FIXED">مبلغ ثابت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>مقدار</Label>
                <Input type="number" min="0" step={discountCodeForm.type === 'PERCENT' ? 0.01 : 1} dir="ltr" value={discountCodeForm.value} onChange={(e) => setDiscountCodeForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>حداقل مبلغ سفارش (ریال)</Label>
                <Input type="number" min="0" dir="ltr" value={discountCodeForm.minOrderIRR} onChange={(e) => setDiscountCodeForm((f) => ({ ...f, minOrderIRR: e.target.value }))} placeholder="خالی = بدون حد" />
              </div>
              <div className="space-y-2">
                <Label>حداکثر تعداد استفاده</Label>
                <Input type="number" min="0" dir="ltr" value={discountCodeForm.maxUses} onChange={(e) => setDiscountCodeForm((f) => ({ ...f, maxUses: e.target.value }))} placeholder="خالی = نامحدود" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اعتبار از</Label>
                <Input type="datetime-local" dir="ltr" value={discountCodeForm.validFrom} onChange={(e) => setDiscountCodeForm((f) => ({ ...f, validFrom: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>اعتبار تا</Label>
                <Input type="datetime-local" dir="ltr" value={discountCodeForm.validTo} onChange={(e) => setDiscountCodeForm((f) => ({ ...f, validTo: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dc-active" checked={discountCodeForm.isActive} onChange={(e) => setDiscountCodeForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              <Label htmlFor="dc-active">فعال</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountCodeDialog(null)}>انصراف</Button>
            <Button onClick={handleSaveDiscountCode} disabled={discountCodeSaving}>
              {discountCodeSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Provider Edit Dialog */}
      <Dialog open={!!providerEditDialog} onOpenChange={() => setProviderEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تنظیم ارائه‌دهنده</DialogTitle>
            <DialogDescription>{providerEditDialog?.displayName} — API Key و فعال/غیرفعال</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="provider-enabled" checked={providerEnabled} onChange={(e) => setProviderEnabled(e.target.checked)} className="rounded" />
              <Label htmlFor="provider-enabled">فعال برای استفاده در سایت</Label>
            </div>
            <div className="space-y-2">
              <Label>API Key (خالی = بدون تغییر)</Label>
              <Input type="password" dir="ltr" placeholder="••••••••" value={providerApiKey} onChange={(e) => setProviderApiKey(e.target.value)} />
            </div>
            {providerEditDialog?.providerKey === 'elevenlabs' && (
              <details className="rounded-lg border border-border bg-muted/40 text-sm">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 font-medium list-none [&::-webkit-details-marker]:hidden">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  راهنمای ساخت API Key و دسترسی ElevenLabs
                </summary>
                <div className="px-3 pb-3 pt-0 space-y-2 text-muted-foreground">
                  <p className="text-xs font-medium text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5">برای TTS کلید را از <strong>تنظیمات پروفایل</strong> بسازید، نه از داخل پروژه ElevenAgents (Developers → API Keys). پلن رایگان برای تست کافی است.</p>
                  <p className="font-medium text-foreground">مراحل:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>ورود به <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">elevenlabs.io</a> و ساخت/ورود اکانت.</li>
                    <li>از <strong>آیکون پروفایل (بالا راست)</strong> → <strong>Profile + API key</strong> یا <strong>Settings</strong> → <strong>API Keys</strong>. یا مستقیم این لینک: <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">elevenlabs.io/app/settings/api-keys</a></li>
                    <li><strong>Create API Key</strong> → نام دلخواه (مثلاً AI Mall).</li>
                    <li>در دسترسی‌ها حتماً <strong>Text to Speech (TTS)</strong> را فعال کنید. در صورت وجود، <strong>Voices</strong> هم برای تست اتصال کامل مفید است.</li>
                    <li>کلید را کپی کرده و اینجا paste کنید و ذخیره کنید؛ سپس «تست اتصال» بزنید.</li>
                  </ol>
                  <p className="text-xs">۴۰۳ = کلید از جای اشتباه ساخته شده یا هنگام «Create Key» دسترسی <strong>Text to Speech</strong> انتخاب نشده. یک کلید جدید بسازید و در مرحلهٔ ساخت حتماً Access levels / Permissions را باز کنید و <strong>Text to Speech</strong> را فعال کنید؛ یا از لینک <strong>elevenlabs.io/app/settings/api-keys</strong> استفاده کنید.</p>
                </div>
              </details>
            )}
            {providerTestResult && (
              <div className="space-y-2">
                <div className={`text-sm flex items-center gap-2 flex-wrap ${providerTestResult.ok ? 'text-green-600' : 'text-destructive'}`}>
                  {providerTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {providerTestResult.ok ? 'اتصال موفق' : providerTestResult.message}
                  {providerTestResult.latencyMs != null && <span className="text-muted-foreground">({providerTestResult.latencyMs === 0 ? '<1' : providerTestResult.latencyMs}ms)</span>}
                </div>
                {providerTestResult.responsePreview && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">پاسخ ElevenLabs</summary>
                    <pre className="mt-1 p-3 rounded-lg bg-muted overflow-auto max-h-48 whitespace-pre-wrap break-all font-mono text-[11px] border border-border" dir="ltr">
                      {providerTestResult.responsePreview}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderEditDialog(null)}>انصراف</Button>
            <Button variant="outline" onClick={handleTestProvider} disabled={providerTestLoading}>
              {providerTestLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              تست اتصال
            </Button>
            <Button onClick={handleSaveProvider} disabled={providerSaving}>
              {providerSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
