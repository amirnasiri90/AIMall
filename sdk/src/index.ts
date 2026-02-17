/**
 * AI Mall API Client — برای استفاده در وب و اپ موبایل (React Native / Flutter)
 * همهٔ درخواست‌ها از طریق REST به Base URL ارسال می‌شوند.
 * @packageDocumentation
 */

const DEFAULT_BASE_URL = 'http://localhost:3001/api/v1';

export interface AimallConfig {
  baseUrl: string;
  getToken?: () => string | null;
}

// ── Types (match backend responses) ──

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  coins: number;
}

export interface BalanceResponse {
  coins: number;
  calculatedBalance?: number;
  isConsistent?: boolean;
  totalCredits?: number;
  totalDebits?: number;
}

export interface Conversation {
  id: string;
  title: string;
  model?: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface TextGenerateOptions {
  prompt: string;
  tone?: string;
  length?: string;
  model?: string;
}

export interface ImageGenerateOptions {
  prompt: string;
  style?: string;
  size?: string;
  model?: string;
}

export interface StreamEvent {
  event: string;
  data?: string;
}

export class AimallClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(config: Partial<AimallConfig> = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.getToken = config.getToken ?? (() => null);
  }

  private base() {
    return this.baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.base()}/${path.replace(/^\//, '')}`;
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((err as { message?: string }).message ?? 'Request failed');
    }
    return res.json() as Promise<T>;
  }

  // ── Auth ──

  async register(data: { email: string; password: string; name?: string }) {
    return this.request<{ access_token: string; user: User }>('auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: User }>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<User>('auth/me');
  }

  // ── Billing ──

  async getBalance() {
    return this.request<BalanceResponse>('billing/balance');
  }

  async getTransactions(page = 1, limit = 20, filters?: { category?: string; type?: string }) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.category) params.set('category', filters.category);
    if (filters?.type) params.set('type', filters.type);
    return this.request<{ transactions: unknown[]; total: number; page: number; limit: number; totalPages: number }>(
      `billing/transactions?${params}`,
    );
  }

  async getPackages() {
    return this.request<Array<{ id: string; name: string; coins: number; priceIRR: number }>>('billing/packages');
  }

  async createPayment(packageId: string) {
    return this.request<{ paymentUrl: string; orderId: string }>('billing/payment/create', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    });
  }

  // ── Conversations ──

  async getConversations(params?: { search?: string; archived?: boolean }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.archived) q.set('archived', 'true');
    const qs = q.toString();
    return this.request<Conversation[]>(`conversations${qs ? `?${qs}` : ''}`);
  }

  async createConversation(title?: string) {
    return this.request<Conversation>('conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title ?? 'گفتگوی جدید' }),
    });
  }

  async getMessages(conversationId: string) {
    return this.request<unknown[]>(`conversations/${conversationId}/messages`);
  }

  // ── Chat ──

  async getChatModels(service?: string) {
    const q = service ? `?service=${service}` : '';
    return this.request<{ models: Array<{ id: string; name?: string }> }>(`chat/models${q}`);
  }

  /**
   * URL for SSE chat stream (use with EventSource or fetch with stream).
   * In browser: new EventSource(client.getChatStreamUrl(...))
   */
  getChatStreamUrl(conversationId: string, message: string, model?: string): string {
    const token = this.getToken();
    const params = new URLSearchParams({ conversationId, message });
    if (model) params.set('model', model);
    if (token) params.set('token', token);
    return `${this.base()}/chat/stream?${params}`;
  }

  /**
   * Consume chat stream via async iterable (Node 18+ or browser with fetch).
   * Yields { event, data } for each SSE message.
   */
  async *streamChat(conversationId: string, message: string, model?: string): AsyncGenerator<StreamEvent> {
    const url = this.getChatStreamUrl(conversationId, message, model);
    const token = this.getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Stream failed: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        let event = 'message';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data = line.slice(5).trim();
          else if (line === '' && data) {
            yield { event, data };
            data = '';
            event = 'message';
          }
        }
        if (data) yield { event, data };
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ── Text Studio ──

  async generateText(options: TextGenerateOptions) {
    return this.request<{ output: string; usage?: unknown; coinCost?: number }>('text/generate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getTextHistory() {
    return this.request<unknown[]>('text/history');
  }

  // ── Image Studio ──

  async generateImage(options: ImageGenerateOptions) {
    return this.request<{ imageUrl: string; model?: string; coinCost?: number }>('images/generate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async generateImageAsync(options: ImageGenerateOptions) {
    return this.request<{ id: string; status: string; type: string; createdAt: string }>('images/generate/async', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getImageHistory() {
    return this.request<unknown[]>('images/history');
  }

  // ── Audio Studio ──

  async textToSpeech(params: { text: string; voice?: string; model?: string }) {
    return this.request<{ url?: string; blob?: string }>('audio/tts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async textToSpeechAsync(params: { text: string; voice?: string; model?: string }) {
    return this.request<{ id: string; status: string }>('audio/tts/async', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async speechToText(file: File | Blob, filename = 'audio.webm') {
    const form = new FormData();
    form.append('file', file, filename);
    const token = this.getToken();
    const res = await fetch(`${this.base()}/audio/stt`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((err as { message?: string }).message ?? 'Request failed');
    }
    return res.json();
  }

  async speechToTextAsync(file: File | Blob, filename = 'audio.webm') {
    const form = new FormData();
    form.append('file', file, filename);
    const token = this.getToken();
    const res = await fetch(`${this.base()}/audio/stt/async`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((err as { message?: string }).message ?? 'Request failed');
    }
    return res.json() as Promise<{ id: string; status: string }>;
  }

  // ── Jobs (async result) ──

  async getJobStatus(jobId: string) {
    return this.request<{ id: string; type: string; status: string; result?: unknown; error?: string }>(
      `jobs/${jobId}`,
    );
  }

  async listJobs(page = 1, limit = 20, status?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return this.request<{ jobs: unknown[]; total: number; page: number; limit: number; totalPages: number }>(
      `jobs?${params}`,
    );
  }
}

export default AimallClient;
