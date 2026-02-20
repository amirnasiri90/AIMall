function getApiBaseUrl(): string {
  const envUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  // در مرورگر از آدرس نسبی استفاده می‌کنیم تا درخواست‌ها از همان دامنه (و پورت) بروند و Next آن‌ها را به بک‌اند پروکسی کند — برای دسترسی از گوشی/سیستم دیگر فقط یک آدرس لازم است
  if (typeof window !== 'undefined') return '/api/v1';
  const port = process.env.NEXT_PUBLIC_BACKEND_PORT || '3001';
  return `http://127.0.0.1:${port}/api/v1`;
}

/** آدرس کامل API برای نمایش در تنظیمات یا لینک به مستندات (همیشه با origin) */
export function getApiBaseUrlFull(): string {
  const envUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') return `${window.location.origin}/api/v1`;
  const port = process.env.NEXT_PUBLIC_BACKEND_PORT || '3001';
  return `http://127.0.0.1:${port}/api/v1`;
}

function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('token');
  return null;
}

/** در صورت ۴۰۱ فراخوانی می‌شود؛ اپ (مثلاً layout) باید logout و redirect به لاگین را اینجا انجام دهد */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}

function clearTokenAndNotify() {
  if (typeof window !== 'undefined') localStorage.removeItem('token');
  onUnauthorized?.();
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = `${getApiBaseUrl()}${endpoint}`;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(fullUrl, { ...options, headers });

  if (res.status === 401) {
    clearTokenAndNotify();
    throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'خطای سرور' }));
    const message =
      Array.isArray(error.message) ? error.message[0] : (error.message || error.error || 'خطای سرور');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/** درخواست با FormData (بدون Content-Type تا مرورگر boundary بگذارد) */
async function requestFormData<T = any>(endpoint: string, formData: FormData, method = 'POST'): Promise<T> {
  const fullUrl = `${getApiBaseUrl()}${endpoint}`;
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(fullUrl, { method, body: formData, headers });

  if (res.status === 401) {
    clearTokenAndNotify();
    throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'خطای سرور' }));
    const message =
      Array.isArray(error.message) ? error.message[0] : (error.message || error.error || 'خطای سرور');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // ── Auth ──
  register: (data: { email?: string; phone?: string; password: string; name?: string }) =>
    request<{ access_token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  registerWithPhone: (data: { phone: string; password?: string; name?: string }) =>
    request<{ access_token: string; user: any }>('/auth/register-phone', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email?: string; phone?: string; password: string }) =>
    request<{ access_token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  sendOtp: (phone: string) =>
    request<{ sent: boolean; message?: string; expiresAt?: string; expiresInSeconds?: number }>('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  loginWithOtp: (phone: string, code: string) =>
    request<{ access_token: string; user: any }>('/auth/login-otp', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  getMe: () => request('/auth/me'),
  updateProfile: (body: { name?: string; phone?: string }) =>
    request('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Conversations ──
  getConversations: (options?: { search?: string; archived?: boolean; organizationId?: string | null }) => {
    const params = new URLSearchParams();
    if (options?.search) params.set('search', options.search);
    if (options?.archived) params.set('archived', 'true');
    if (options?.organizationId !== undefined) params.set('organizationId', options.organizationId ?? '');
    const qs = params.toString();
    return request(`/conversations${qs ? `?${qs}` : ''}`);
  },
  createConversation: (title?: string, organizationId?: string | null) =>
    request('/conversations', { method: 'POST', body: JSON.stringify({ title, organizationId: organizationId ?? undefined }) }),
  deleteConversation: (id: string) => request(`/conversations/${id}`, { method: 'DELETE' }),
  getMessages: (convId: string) => request(`/conversations/${convId}/messages`),
  updateConversationTitle: (id: string, title: string) =>
    request(`/conversations/${id}/title`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  togglePinConversation: (id: string) =>
    request(`/conversations/${id}/pin`, { method: 'PATCH' }),
  toggleArchiveConversation: (id: string) =>
    request(`/conversations/${id}/archive`, { method: 'PATCH' }),
  updateSystemPrompt: (id: string, systemPrompt: string) =>
    request(`/conversations/${id}/system-prompt`, { method: 'PATCH', body: JSON.stringify({ systemPrompt }) }),

  // ── Memory ──
  getMemories: (convId: string) => request(`/conversations/${convId}/memories`),
  createMemory: (convId: string, type: string, content: string) =>
    request(`/conversations/${convId}/memories`, { method: 'POST', body: JSON.stringify({ type, content }) }),
  updateMemory: (convId: string, memoryId: string, content: string) =>
    request(`/conversations/${convId}/memories/${memoryId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteMemory: (convId: string, memoryId: string) =>
    request(`/conversations/${convId}/memories/${memoryId}`, { method: 'DELETE' }),
  triggerSummary: (convId: string) =>
    request(`/conversations/${convId}/summarize`, { method: 'POST' }),

  // ── Chat ──
  getModels: (service?: string) => request(`/chat/models${service ? `?service=${service}` : ''}`),
  getChatModes: () => request<Record<string, { id: string; label: string; modelId: string }>>('/chat/modes'),
  chatStreamUrl: (
    convId: string,
    message: string,
    opts?: { model?: string; mode?: string; regenerate?: boolean; regenerateStyle?: string; quickAction?: string; referenceMessageId?: string },
  ) => {
    const params = new URLSearchParams({ conversationId: convId, message: message || '' });
    if (opts?.model) params.set('model', opts.model);
    if (opts?.mode) params.set('mode', opts.mode);
    if (opts?.regenerate) params.set('regenerate', 'true');
    if (opts?.regenerateStyle) params.set('regenerateStyle', opts.regenerateStyle);
    if (opts?.quickAction) params.set('quickAction', opts.quickAction);
    if (opts?.referenceMessageId) params.set('referenceMessageId', opts.referenceMessageId);
    const token = getToken();
    if (token) params.set('token', token);
    return `${getApiBaseUrl()}/chat/stream?${params}`;
  },
  estimateChat: (message: string, mode?: string, model?: string, conversationId?: string) =>
    request<{ estimatedCoins: number }>('/chat/estimate', {
      method: 'POST',
      body: JSON.stringify({ message, mode, model, conversationId }),
    }),
  /** POST chat stream (for requests with attachments). Returns response for streaming. */
  chatStreamPost: async (
    body: {
      conversationId: string;
      message: string;
      mode?: string;
      model?: string;
      regenerate?: boolean;
      regenerateStyle?: string;
      quickAction?: string;
      referenceMessageId?: string;
      attachments?: { type: string; data: string; name?: string }[];
    },
  ) => {
    const token = getToken();
    const res = await fetch(`${getApiBaseUrl()}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      clearTokenAndNotify();
      throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'خطای سرور' }));
      throw new Error(err.message || 'خطا در ارسال');
    }
    return res;
  },
  forkConversation: (conversationId: string, upToMessageId: string) =>
    request<{ id: string }>('/conversations/' + conversationId + '/fork?upToMessageId=' + encodeURIComponent(upToMessageId), { method: 'POST' }),

  // ── Studios ──
  getTextTemplates: () => request<{ id: string; name: string; description: string; placeholder: string }[]>('/text/templates'),
  estimateText: (model?: string) =>
    request<{ estimatedCoins: number }>('/text/estimate', { method: 'POST', body: JSON.stringify({ model: model || undefined }) }),
  generateText: (data: {
    prompt: string;
    tone?: string;
    length?: string;
    model?: string;
    templateId?: string;
    variants?: number;
    maxTokens?: number;
    language?: string;
    audience?: string;
    styleGuide?: string;
    organizationId?: string | null;
  }) => request<{ output: string | string[]; model: string; coinCost: number; variants?: string[] }>('/text/generate', { method: 'POST', body: JSON.stringify({ ...data, organizationId: data.organizationId ?? undefined }) }),
  textStreamPost: async (data: {
    prompt: string;
    tone?: string;
    length?: string;
    model?: string;
    maxTokens?: number;
    language?: string;
    audience?: string;
    styleGuide?: string;
    organizationId?: string | null;
  }) => {
    const token = getToken();
    const { organizationId, ...rest } = data;
    const body = { ...rest, organizationId: organizationId ?? undefined };
    const res = await fetch(`${getApiBaseUrl()}/text/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      clearTokenAndNotify();
      throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'خطای سرور' }));
      throw new Error(err.message || 'خطا');
    }
    return res;
  },
  textAction: (data: { action: string; text: string; tone?: string; model?: string; organizationId?: string | null }) =>
    request<{ output: string; coinCost: number; model: string }>('/text/action', { method: 'POST', body: JSON.stringify({ ...data, organizationId: data.organizationId ?? undefined }) }),
  getTextHistory: (params?: { search?: string; from?: string; to?: string; tag?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    if (params?.tag) sp.set('tag', params.tag);
    const qs = sp.toString();
    return request<any[]>(`/text/history${qs ? `?${qs}` : ''}`);
  },
  getImageTemplates: () => request<{ id: string; name: string; description: string; placeholder: string; promptSuffix?: string }[]>('/images/templates'),
  getImageRatios: () => request<{ value: string; label: string; labelEn: string }[]>('/images/ratios'),
  estimateImage: (model?: string, count?: number) =>
    request<{ estimatedCoins: number }>('/images/estimate', { method: 'POST', body: JSON.stringify({ model: model || undefined, count: count || undefined }) }),
  generateImage: (data: {
    prompt: string;
    style?: string;
    size?: string;
    model?: string;
    templateId?: string;
    ratio?: string;
    sizeTier?: string;
    count?: number;
    styleGuide?: string;
    negativePrompt?: string;
    tag?: string;
    organizationId?: string | null;
  }) => request<{ imageUrl?: string; imageUrls?: string[]; model: string; coinCost: number; enhancedPrompt?: string; dimensions?: { w: number; h: number } }>('/images/generate', { method: 'POST', body: JSON.stringify({ ...data, organizationId: data.organizationId ?? undefined }) }),
  generateImageAsync: (data: any) => request('/images/generate/async', { method: 'POST', body: JSON.stringify({ ...data, organizationId: data.organizationId ?? undefined }) }),
  getImageHistory: (params?: { search?: string; from?: string; to?: string; model?: string; style?: string; tag?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    if (params?.model) sp.set('model', params.model);
    if (params?.style) sp.set('style', params.style);
    if (params?.tag) sp.set('tag', params.tag);
    const qs = sp.toString();
    return request<any[]>(`/images/history${qs ? `?${qs}` : ''}`);
  },
  getVideoModels: () => request<{ id: string; name: string; description?: string; coinCost?: number }[]>('/video/models'),
  estimateVideo: (model?: string, durationSeconds?: number) =>
    request<{ estimatedCoins: number }>('/video/estimate', {
      method: 'POST',
      body: JSON.stringify({ model: model || undefined, durationSeconds }),
    }),
  generateVideo: (data: {
    prompt: string;
    model?: string;
    duration?: number;
    aspectRatio?: string;
  }) =>
    request<{ videoUrl?: string; message: string; jobId?: string }>('/video/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  estimateAudio: (type: 'tts' | 'stt', model?: string) =>
    request<{ estimatedCoins: number }>('/audio/estimate', { method: 'POST', body: JSON.stringify({ type, model }) }),
  getAudioHistory: (params?: { search?: string; from?: string; to?: string; type?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    if (params?.type && params.type !== '_all') sp.set('type', params.type);
    const qs = sp.toString();
    return request<any[]>(`/audio/history${qs ? `?${qs}` : ''}`);
  },
  textToSpeech: (data: { text: string; voice?: string; model?: string; speed?: number; language?: string }) =>
    request<{ audioUrl?: string; duration?: number; model?: string; coinCost?: number }>('/audio/tts', { method: 'POST', body: JSON.stringify(data) }),
  textToSpeechAsync: (data: any) => request('/audio/tts/async', { method: 'POST', body: JSON.stringify(data) }),
  speechToText: async (file: File, model?: string) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    if (model) formData.append('model', model);
    const res = await fetch(`${getApiBaseUrl()}/audio/stt`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (res.status === 401) {
      clearTokenAndNotify();
      throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'خطای سرور' }));
      throw new Error(error.message || 'خطای سرور');
    }
    return res.json();
  },
  speechToTextAsync: async (file: File, model?: string) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    if (model) formData.append('model', model);
    const res = await fetch(`${getApiBaseUrl()}/audio/stt/async`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (res.status === 401) {
      clearTokenAndNotify();
      throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'خطای سرور' }));
      throw new Error(error.message || 'خطای سرور');
    }
    return res.json();
  },

  // ── Billing ──
  getBalance: () => request('/billing/balance'),
  getDashboardOverview: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`/dashboard/overview${qs ? `?${qs}` : ''}`);
  },
  getMenuFlags: (): Promise<{ knowledge: boolean; workflows: boolean; jobs: boolean; developer: boolean }> =>
    request('/dashboard/menu-flags'),

  /** تحلیل خواستهٔ محاوره‌ای کاربر با AI و پیشنهاد بخش پنل. در صورت خطا null برمی‌گرداند. */
  classifyIntent: (text: string): Promise<{ href: string; label: string; desc: string } | null> =>
    request('/dashboard/intent/classify', { method: 'POST', body: JSON.stringify({ text: text?.trim() || '' }) }),

  // ── Support (تیکت پشتیبانی) ──
  createTicket: (subject: string, body: string, category?: 'CONSULTING_SALES' | 'TECHNICAL', attachment?: File) => {
    if (attachment) {
      const form = new FormData();
      form.set('subject', subject);
      form.set('body', body);
      form.set('category', category ?? 'CONSULTING_SALES');
      form.set('attachment', attachment);
      return requestFormData<{ id: string }>('/support', form);
    }
    return request('/support', { method: 'POST', body: JSON.stringify({ subject, body, category: category ?? 'CONSULTING_SALES' }) });
  },
  getMyTickets: (status?: string) =>
    request(`/support${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  getTicket: (id: string) => request(`/support/${id}`),
  reopenTicket: (id: string) => request(`/support/${id}/reopen`, { method: 'POST' }),
  addTicketMessage: (ticketId: string, content: string, attachment?: File) => {
    if (attachment) {
      const form = new FormData();
      form.set('content', content);
      form.set('attachment', attachment);
      return requestFormData(`/support/${ticketId}/messages`, form);
    }
    return request(`/support/${ticketId}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
  },
  /** آدرس مستقیم پیوست (برای fetch با توکن) */
  supportAttachmentUrl: (ticketId: string, attachmentUrl: string) => {
    const filename = attachmentUrl.includes('/') ? attachmentUrl.split('/')[1] : attachmentUrl;
    return `${getApiBaseUrl()}/support/attachments/${ticketId}/${filename}`;
  },
  /** دریافت پیوست به‌صورت blob و برگرداندن object URL برای نمایش در img (باید بعداً revokeObjectURL فراخوانی شود) */
  async getSupportAttachmentBlobUrl(ticketId: string, attachmentUrl: string): Promise<string> {
    const url = api.supportAttachmentUrl(ticketId, attachmentUrl);
    const token = getToken();
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.status === 401) {
      clearTokenAndNotify();
      throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
    }
    if (!res.ok) throw new Error('بارگذاری تصویر ناموفق');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  getTransactions: (page?: number, limit?: number, filters?: { category?: string; type?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    params.set('page', String(page || 1));
    params.set('limit', String(limit || 20));
    if (filters?.category) params.set('category', filters.category);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return request(`/billing/transactions?${params}`);
  },
  getPackages: () => request('/billing/packages'),
  previewPayment: (packageId: string, discountCode?: string) =>
    request('/billing/payment/preview', { method: 'POST', body: JSON.stringify({ packageId, discountCode: discountCode || undefined }) }),
  createPayment: (packageId: string, discountCode?: string) =>
    request('/billing/payment/create', { method: 'POST', body: JSON.stringify({ packageId: String(packageId), discountCode: discountCode || undefined }) }),
  getPaymentOrders: (page?: number, limit?: number) =>
    request(`/billing/payment/orders?page=${page || 1}&limit=${limit || 20}`),
  getLedgerSummary: () => request('/billing/ledger/summary'),
  reconcile: () => request('/billing/reconcile', { method: 'POST' }),
  mockTopup: (amount: number) => request('/billing/topup/mock', { method: 'POST', body: JSON.stringify({ amount }) }),

  // ── Agents ──
  getAgents: () => request('/agents'),
  getAgentConversations: (agentId: string, organizationId?: string | null) => {
    const params = new URLSearchParams();
    if (organizationId !== undefined) params.set('organizationId', organizationId ?? '');
    const qs = params.toString();
    return request(`/agents/${agentId}/conversations${qs ? `?${qs}` : ''}`);
  },
  createAgentConversation: (agentId: string, title?: string, organizationId?: string | null) =>
    request(`/agents/${agentId}/conversations`, { method: 'POST', body: JSON.stringify({ title, organizationId: organizationId ?? undefined }) }),
  deleteAgentConversation: (agentId: string, convId: string) =>
    request(`/agents/${agentId}/conversations/${convId}`, { method: 'DELETE' }),
  getAgentMessages: (agentId: string, convId: string) =>
    request(`/agents/${agentId}/conversations/${convId}/messages`),
  agentStreamUrl: (agentId: string, convId: string, message: string, params: {
    level: string; style: string; mode: string; subject?: string; integrityMode: boolean;
    place?: string; timePerDay?: string;
    travelStyle?: string; destinationType?: string;
    workspaceContext?: string;
  }) => {
    const qs = new URLSearchParams({
      conversationId: convId,
      message,
      level: params.level,
      style: params.style,
      mode: params.mode,
      integrityMode: String(params.integrityMode),
    });
    if (params.subject) qs.set('subject', params.subject);
    if (params.place) qs.set('place', params.place);
    if (params.timePerDay) qs.set('timePerDay', params.timePerDay);
    if (params.travelStyle) qs.set('travelStyle', params.travelStyle);
    if (params.destinationType) qs.set('destinationType', params.destinationType);
    if (params.workspaceContext && params.workspaceContext.trim()) qs.set('workspaceContext', params.workspaceContext.trim());
    const token = getToken();
    if (token) qs.set('token', token);
    return `${getApiBaseUrl()}/agents/${agentId}/stream?${qs}`;
  },

  // ── Persian PDF Maker (تبدیل به PDF فارسی) ──
  persianPdfTextToPdf: (body: {
    text: string;
    title?: string;
    options?: { font?: string; fontSize?: number; lineHeight?: number; digits?: 'fa' | 'en'; headerFooter?: { pageNumbers?: boolean; jalaliDate?: boolean; docTitle?: string } };
  }) => request<{ fileId: string; downloadUrl: string; pdfBase64?: string }>('/assistants/persian-pdf/text-to-pdf', { method: 'POST', body: JSON.stringify(body) }),
  persianPdfDocxToPdf: (body: {
    fileBase64: string;
    fileName: string;
    options?: { font?: string; fontSize?: number; lineHeight?: number; digits?: 'fa' | 'en'; headerFooter?: { pageNumbers?: boolean; jalaliDate?: boolean; docTitle?: string } };
  }) => request<{ fileId: string; downloadUrl: string; pdfBase64?: string }>('/assistants/persian-pdf/docx-to-pdf', { method: 'POST', body: JSON.stringify(body) }),
  persianPdfDownloadUrl: (fileId: string) => `${getApiBaseUrl()}/assistants/persian-pdf/files/${fileId}`,

  // ── Tools ──
  getTools: (enabledOnly?: boolean) => request(`/tools${enabledOnly ? '?enabled=true' : ''}`),
  executeTool: (name: string, input: string) =>
    request(`/tools/${name}/execute`, { method: 'POST', body: JSON.stringify({ input }) }),

  // ── Admin ──
  getAdminUsers: (search?: string, page?: number, limit?: number, role?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page || 1));
    params.set('limit', String(limit || 20));
    if (role) params.set('role', role);
    return request(`/admin/users?${params}`);
  },
  getAdminStats: () => request('/admin/stats'),
  getDailyStats: (days?: number) => request(`/admin/stats/daily?days=${days || 30}`),
  getServiceStats: () => request('/admin/stats/services'),
  getRevenueStats: (days?: number) => request(`/admin/stats/revenue?days=${days || 30}`),
  getAdminUser: (id: string) => request(`/admin/users/${id}`),
  updateAdminUser: (id: string, body: { name?: string; email?: string; role?: string; coins?: number; password?: string }) =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adjustUserCoins: (userId: string, amount: number, reason: string) =>
    request(`/admin/users/${userId}/coins`, { method: 'PATCH', body: JSON.stringify({ amount, reason }) }),

  // Admin - Pricing & Model Costs
  getAdminPricing: () => request('/admin/pricing/coin-price'),
  getAdminModelCosts: () => request('/admin/pricing/model-costs'),
  setAdminCoinPrice: (coinPriceIRR: number) =>
    request('/admin/pricing/coin-price', { method: 'PATCH', body: JSON.stringify({ coinPriceIRR }) }),
  setAdminModelCosts: (service: 'text' | 'image' | 'tts' | 'stt', costs: Record<string, number>) =>
    request(`/admin/pricing/model-costs/${service}`, { method: 'PATCH', body: JSON.stringify(costs) }),

  // Admin - Coin Packages
  getAdminPackages: () => request('/admin/packages'),
  createAdminPackage: (body: { name: string; coins: number; priceIRR: number; description?: string; sortOrder?: number; discountPercent?: number; isActive?: boolean; packageType?: string }) =>
    request('/admin/packages', { method: 'POST', body: JSON.stringify(body) }),
  updateAdminPackage: (id: string, body: Partial<{ name: string; coins: number; priceIRR: number; description: string; sortOrder: number; discountPercent: number; isActive: boolean; packageType: string }>) =>
    request(`/admin/packages/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateAdminPackageType: (id: string, packageType: 'PERSONAL' | 'ORGANIZATION') =>
    request(`/admin/packages/${id}/package-type?packageType=${encodeURIComponent(packageType)}`, { method: 'PATCH', body: JSON.stringify({ packageType }) }),
  deleteAdminPackage: (id: string) =>
    request(`/admin/packages/${id}/delete`, { method: 'POST' }),

  // Admin - Discount Codes
  getAdminDiscountCodes: (page?: number, limit?: number) =>
    request(`/admin/discount-codes?page=${page || 1}&limit=${limit || 20}`),
  createAdminDiscountCode: (body: { code: string; type?: 'PERCENT' | 'FIXED'; value: number; minOrderIRR?: number; maxUses?: number; validFrom?: string; validTo?: string; isActive?: boolean }) =>
    request('/admin/discount-codes', { method: 'POST', body: JSON.stringify(body) }),
  updateAdminDiscountCode: (id: string, body: Partial<{ code: string; type: string; value: number; minOrderIRR: number | null; maxUses: number | null; validFrom: string | null; validTo: string | null; isActive: boolean }>) =>
    request(`/admin/discount-codes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAdminDiscountCode: (id: string) =>
    request(`/admin/discount-codes/${id}/delete`, { method: 'POST' }),

  // Admin - Support Tickets
  getAdminTickets: (options?: { status?: string; category?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.category) params.set('category', options.category);
    params.set('page', String(options?.page ?? 1));
    params.set('limit', String(options?.limit ?? 20));
    return request(`/admin/tickets?${params}`);
  },
  getAdminTicket: (id: string) => request(`/admin/tickets/${id}`),
  updateAdminTicket: (id: string, body: { status?: string; assignedToId?: string | null }) =>
    request(`/admin/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  replyAdminTicket: (id: string, content: string, attachment?: File) => {
    if (attachment) {
      const form = new FormData();
      form.set('content', content);
      form.set('attachment', attachment);
      return requestFormData(`/admin/tickets/${id}/messages`, form);
    }
    return request(`/admin/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
  },
  adminTicketAttachmentUrl: (ticketId: string, attachmentUrl: string) => {
    const filename = attachmentUrl.includes('/') ? attachmentUrl.split('/')[1] : attachmentUrl;
    return `${getApiBaseUrl()}/admin/tickets/${ticketId}/attachments/${filename}`;
  },
  async getAdminTicketAttachmentBlobUrl(ticketId: string, attachmentUrl: string): Promise<string> {
    const url = api.adminTicketAttachmentUrl(ticketId, attachmentUrl);
    const token = getToken();
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.status === 401) {
      clearTokenAndNotify();
      throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
    }
    if (!res.ok) throw new Error('بارگذاری تصویر ناموفق');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Admin - Settings
  getAdminSettings: (category?: string) =>
    request(`/admin/settings${category ? `?category=${category}` : ''}`),
  updateAdminSetting: (key: string, value: string) =>
    request(`/admin/settings/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) }),

  // Branding (عمومی — بدون توکن)
  getBranding: (): Promise<{ favicon: string | null; appleTouchIcon: string | null; pwa192: string | null; pwa512: string | null; logo: string | null }> =>
    fetch(`${getApiBaseUrl()}/branding`).then((r) => (r.ok ? r.json() : Promise.resolve({ favicon: null, appleTouchIcon: null, pwa192: null, pwa512: null, logo: null }))),
  getBrandingUploadUrl: (filename: string) => `${getApiBaseUrl()}/uploads/site/${filename}`,
  uploadBranding: async (type: string, file: File) => {
    const form = new FormData();
    form.append('type', type);
    form.append('file', file);
    const token = getToken();
    const res = await fetch(`${getApiBaseUrl()}/admin/branding/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.status === 401) {
      clearTokenAndNotify();
      throw new Error('نشست منقضی شده. لطفاً دوباره وارد شوید.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'خطای سرور' }));
      throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'خطا');
    }
    return res.json();
  },

  // Admin - Audit Logs
  getAuditLogs: (options?: { userId?: string; action?: string; entity?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);
    if (options?.action) params.set('action', options.action);
    if (options?.entity) params.set('entity', options.entity);
    if (options?.from) params.set('from', options.from);
    if (options?.to) params.set('to', options.to);
    params.set('page', String(options?.page || 1));
    params.set('limit', String(options?.limit || 50));
    return request(`/admin/audit-logs?${params}`);
  },

  // Admin - SLA (Phase 3)
  getSlaStatus: () => request('/sla/status'),
  getSlaTargets: () => request('/sla/targets'),
  getSlaReport: () => request('/sla/report'),
  updateSlaTargets: (body: { uptimePercentMin?: number; p95LatencyMsMax?: number }) =>
    request('/sla/targets', { method: 'PATCH', body: JSON.stringify(body) }),

  // Admin - Audit export / purge
  getAuditRetention: () => request('/admin/audit-logs/retention'),
  exportAuditLogsUrl: (format: 'csv' | 'json', from?: string, to?: string) => {
    const params = new URLSearchParams({ format });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const token = getToken();
    if (token) params.set('token', token);
    return `${getApiBaseUrl()}/admin/audit-logs/export?${params}`;
  },
  purgeAuditLogs: (olderThanDays?: number) =>
    request('/admin/audit-logs/purge', { method: 'POST', body: JSON.stringify({ olderThanDays }) }),

  // Admin - Organizations (قراردادها)
  getAdminOrganizations: (page?: number, limit?: number, search?: string) => {
    const params = new URLSearchParams();
    params.set('page', String(page || 1));
    params.set('limit', String(limit || 20));
    if (search) params.set('search', search);
    return request(`/admin/organizations?${params}`);
  },
  updateOrgContract: (orgId: string, body: { contractEndsAt?: string | null; customCoinQuota?: number | null; plan?: string }) =>
    request(`/admin/organizations/${orgId}/contract`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Admin - Provider Health
  getProvidersHealth: () => request('/admin/providers/health'),
  toggleProvider: (providerId: string, enabled: boolean) =>
    request(`/admin/providers/${providerId}/toggle`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),

  // Admin - AI Providers (config, API key, test)
  getAiProviders: () => request('/admin/ai-providers'),
  getAiProvider: (id: string) => request(`/admin/ai-providers/${id}`),
  updateAiProvider: (id: string, body: { displayName?: string; apiKey?: string; config?: object; isEnabled?: boolean }) =>
    request(`/admin/ai-providers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  testAiProvider: (id: string, apiKey?: string) =>
    request(`/admin/ai-providers/${id}/test`, { method: 'POST', body: JSON.stringify(apiKey != null ? { apiKey } : {}) }),

  // Admin - Service Mapping (which provider+model for chat, text, image, etc.)
  getServiceMapping: () => request<Record<string, Array<{ providerKey: string; modelId: string; label?: string }>>>('/admin/service-mapping'),
  setServiceMapping: (payload: Record<string, Array<{ providerKey: string; modelId: string; label?: string }>>) =>
    request('/admin/service-mapping', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Admin - Reconciliation
  reconcileAll: () => request('/admin/reconcile-all', { method: 'POST' }),

  // Admin - Export
  exportUsersUrl: () => {
    const token = getToken();
    return `${getApiBaseUrl()}/admin/export/users${token ? `?token=${token}` : ''}`;
  },
  exportTransactionsUrl: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    const token = getToken();
    if (token) params.set('token', token);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `${getApiBaseUrl()}/admin/export/transactions?${params}`;
  },

  // ── Phase 2: API Keys ──
  createApiKey: (name: string, scopes?: string) =>
    request('/api-keys', { method: 'POST', body: JSON.stringify({ name, scopes }) }),
  listApiKeys: () => request('/api-keys'),
  deleteApiKey: (id: string) => request(`/api-keys/${id}`, { method: 'DELETE' }),

  // ── Phase 2: Organizations ──
  createOrganization: (name: string) =>
    request('/organizations', { method: 'POST', body: JSON.stringify({ name }) }),
  listOrganizations: () => request('/organizations'),
  getProfileContext: (organizationId?: string | null): Promise<{
    organizationName: string;
    limitChats: number | null;
    limitImageGen: number | null;
    limitTextGen: number | null;
    canUseAgents: boolean;
    chatCount: number;
    imageCount: number;
    textCount: number;
  } | null> => {
    const q = organizationId != null && organizationId !== '' ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    return request(`/organizations/context${q}`);
  },
  getOrganization: (id: string) => request(`/organizations/${id}`),
  getOrganizationMembers: (id: string) => request(`/organizations/${id}/members`),
  updateOrganization: (id: string, body: { memberLimit?: number | null }) =>
    request(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getOrganizationUsage: (id: string, params?: { from?: string; to?: string }) => {
    const search = new URLSearchParams();
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    const qs = search.toString();
    return request(`/organizations/${id}/usage${qs ? `?${qs}` : ''}`);
  },
  inviteMember: (orgId: string, email: string, role: string) =>
    request(`/organizations/${orgId}/members/invite`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  updateMemberLimits: (
    orgId: string,
    memberId: string,
    body: { limitChats?: number | null; limitImageGen?: number | null; limitTextGen?: number | null; canUseAgents?: boolean },
  ) =>
    request(`/organizations/${orgId}/members/${memberId}/limits`, { method: 'PATCH', body: JSON.stringify(body) }),
  getMemberUsageCounts: (orgId: string, memberId: string) =>
    request(`/organizations/${orgId}/members/${memberId}/usage-counts`),
  updateMemberRole: (orgId: string, memberId: string, role: string) =>
    request(`/organizations/${orgId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (orgId: string, memberId: string) =>
    request(`/organizations/${orgId}/members/${memberId}`, { method: 'DELETE' }),
  leaveOrganization: (orgId: string) =>
    request(`/organizations/${orgId}/leave`, { method: 'POST' }),
  getMyInvitations: () => request('/organizations/invitations/my'),
  acceptInvitation: (invitationId: string) =>
    request(`/organizations/invitations/${invitationId}/accept`, { method: 'POST' }),
  rejectInvitation: (invitationId: string) =>
    request(`/organizations/invitations/${invitationId}/reject`, { method: 'POST' }),
  getOrganizationInvitations: (orgId: string) => request(`/organizations/${orgId}/invitations`),

  // ── Phase 2: Jobs ──
  createJob: (type: string, payload: Record<string, any>) =>
    request('/jobs', { method: 'POST', body: JSON.stringify({ type, payload }) }),
  listJobs: (page?: number, limit?: number, status?: string) =>
    request(`/jobs?page=${page || 1}&limit=${limit || 20}${status ? `&status=${status}` : ''}`),
  getJobStatus: (id: string) => request(`/jobs/${id}`),

  // ── Phase 2: Knowledge Base (RAG) ──
  createKnowledgeBase: (name: string, organizationId?: string) =>
    request('/knowledge/bases', { method: 'POST', body: JSON.stringify({ name, organizationId }) }),
  listKnowledgeBases: (organizationId?: string) =>
    request(`/knowledge/bases${organizationId ? `?organizationId=${organizationId}` : ''}`),
  addDocument: (kbId: string, name: string, content: string) =>
    request(`/knowledge/bases/${kbId}/documents`, { method: 'POST', body: JSON.stringify({ name, content }) }),
  getDocuments: (kbId: string) => request(`/knowledge/bases/${kbId}/documents`),
  searchKnowledge: (kbId: string, q: string, topK?: number) =>
    request(`/knowledge/bases/${kbId}/search?q=${encodeURIComponent(q)}${topK ? `&topK=${topK}` : ''}`),
  deleteDocument: (kbId: string, docId: string) =>
    request(`/knowledge/bases/${kbId}/documents/${docId}`, { method: 'DELETE' }),
  deleteKnowledgeBase: (kbId: string) =>
    request(`/knowledge/bases/${kbId}`, { method: 'DELETE' }),

  // ── Phase 2: Workflows ──
  createWorkflow: (name: string, definition: any, organizationId?: string) =>
    request('/workflows', { method: 'POST', body: JSON.stringify({ name, definition, organizationId }) }),
  listWorkflows: (organizationId?: string) => request(`/workflows${organizationId ? `?organizationId=${organizationId}` : ''}`),
  getWorkflow: (id: string) => request(`/workflows/${id}`),
  runWorkflow: (id: string, input: Record<string, any>, async?: boolean) =>
    request(`/workflows/${id}/run`, { method: 'POST', body: JSON.stringify({ input, async }) }),
  getWorkflowRuns: (id: string, limit?: number) =>
    request(`/workflows/${id}/runs${limit ? `?limit=${limit}` : ''}`),
  getWorkflowRun: (workflowId: string, runId: string) =>
    request(`/workflows/${workflowId}/runs/${runId}`),
};
