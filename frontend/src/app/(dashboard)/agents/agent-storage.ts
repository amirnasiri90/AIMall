/**
 * localStorage helpers for agent Saved items and per-agent Settings (Phase 4).
 * Keys are scoped by agentId so each assistant has its own saved list and settings.
 */

const SAVED_PREFIX = 'aimall_agent_saved_';
const SETTINGS_PREFIX = 'aimall_agent_settings_';

export interface SavedItem {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO
}

export interface StreamParams {
  level: string;
  style: string;
  mode: string;
}

export interface AgentSettings {
  tone?: string;
  language?: string;
  notifyOnSave?: boolean;
  /** سطح، سبک و حالت مدل (مثل دستیار دانش‌آموز/ورزش) */
  streamParams?: StreamParams;
}

function getKey(prefix: string, agentId: string) {
  return `${prefix}${agentId}`;
}

export function getSavedItems(agentId: string): SavedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getKey(SAVED_PREFIX, agentId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSavedItem(agentId: string, item: Omit<SavedItem, 'id' | 'createdAt'>): SavedItem {
  const full: SavedItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const list = getSavedItems(agentId);
  list.unshift(full);
  localStorage.setItem(getKey(SAVED_PREFIX, agentId), JSON.stringify(list));
  return full;
}

export function removeSavedItem(agentId: string, id: string): void {
  const list = getSavedItems(agentId).filter((i) => i.id !== id);
  localStorage.setItem(getKey(SAVED_PREFIX, agentId), JSON.stringify(list));
}

export function getAgentSettings(agentId: string): AgentSettings {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getKey(SETTINGS_PREFIX, agentId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setAgentSettings(agentId: string, settings: AgentSettings): void {
  localStorage.setItem(getKey(SETTINGS_PREFIX, agentId), JSON.stringify(settings));
}

/** First line or first 80 chars for title */
export function titleFromContent(content: string, maxLen = 80): string {
  const firstLine = content.split('\n')[0]?.trim() || '';
  if (firstLine.length <= maxLen) return firstLine || 'بدون عنوان';
  return firstLine.slice(0, maxLen) + '…';
}

const MAX_WORKSPACE_CONTEXT_LEN = 1200;

/** داده‌های فضای کار کاربر را از localStorage می‌خواند و به صورت متن کوتاه برای ارسال به بک‌اند برمی‌گرداند. */
export function getWorkspaceContextForAgent(agentId: string): string {
  if (typeof window === 'undefined') return '';
  const parts: string[] = [];
  try {
    switch (agentId) {
      case 'fashion': {
        const raw = localStorage.getItem('aimall_agent_fashion_closet');
        const closet = raw ? JSON.parse(raw) : [];
        if (Array.isArray(closet) && closet.length > 0) {
          const items = closet.slice(0, 30).map((i: { name?: string; color?: string; category?: string }) => `${i.name || ''} (${i.color || ''}, ${i.category || ''})`).filter(Boolean);
          if (items.length) parts.push('کمد: ' + items.join('؛ '));
        }
        break;
      }
      case 'home': {
        const raw = localStorage.getItem('aimall_agent_home_pantry');
        const pantry = raw ? JSON.parse(raw) : [];
        if (Array.isArray(pantry) && pantry.length > 0) {
          const items = pantry.slice(0, 25).map((i: { name?: string; expiry?: string }) => i.expiry ? `${i.name} (انقضا: ${i.expiry})` : i.name).filter(Boolean);
          if (items.length) parts.push('یخچال/انباری: ' + items.join('، '));
        }
        break;
      }
      case 'finance': {
        const raw = localStorage.getItem('aimall_agent_finance_watchlist');
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list) && list.length > 0) parts.push('واچ‌لیست: ' + list.slice(0, 20).join('، '));
        break;
      }
      case 'lifestyle': {
        const tasksRaw = localStorage.getItem('aimall_agent_lifestyle_tasks');
        const habitsRaw = localStorage.getItem('aimall_agent_lifestyle_habits');
        const tasks = tasksRaw ? JSON.parse(tasksRaw) : [];
        const habits = habitsRaw ? JSON.parse(habitsRaw) : [];
        if (Array.isArray(tasks) && tasks.length > 0) {
          const byStatus = { todo: [] as string[], doing: [] as string[], done: [] as string[] };
          tasks.forEach((t: { title?: string; status?: string }) => {
            const s = (t.status || 'todo') as keyof typeof byStatus;
            if (byStatus[s]) byStatus[s].push(t.title || '');
          });
          const lines = [];
          if (byStatus.todo.length) lines.push('کارها: ' + byStatus.todo.slice(0, 8).join('، '));
          if (byStatus.doing.length) lines.push('در حال انجام: ' + byStatus.doing.slice(0, 5).join('، '));
          if (byStatus.done.length) lines.push('انجام‌شده: ' + byStatus.done.slice(0, 5).join('، '));
          if (lines.length) parts.push(lines.join('. '));
        }
        if (Array.isArray(habits) && habits.length > 0) {
          const h = habits.slice(0, 10).map((x: { name?: string; count?: number }) => `${x.name}: ${x.count ?? 0}`).join('؛ ');
          parts.push('عادت‌ها: ' + h);
        }
        break;
      }
      case 'instagram-admin': {
        const kitRaw = localStorage.getItem('aimall_agent_instagram_brandkit');
        const macrosRaw = localStorage.getItem('aimall_agent_instagram_macro_replies');
        const kit = kitRaw ? JSON.parse(kitRaw) : {};
        const macros = macrosRaw ? JSON.parse(macrosRaw) : [];
        if (kit && (kit.name || kit.tone || kit.domain)) {
          const k = [];
          if (kit.name) k.push('برند: ' + kit.name);
          if (kit.domain) k.push('حوزه: ' + kit.domain);
          if (kit.tone) k.push('لحن: ' + kit.tone);
          if (kit.keywords) k.push('کلمات کلیدی: ' + kit.keywords);
          if (kit.forbiddenWords) k.push('کلمات ممنوع: ' + kit.forbiddenWords);
          if (k.length) parts.push('برند کیت: ' + k.join('. '));
        }
        if (Array.isArray(macros) && macros.length > 0) parts.push('پاسخ‌های آماده: ' + macros.slice(0, 5).map((m: { name?: string }) => m.name).filter(Boolean).join('، '));
        break;
      }
      default:
        break;
    }
    const text = parts.join('\n');
    return text.length > MAX_WORKSPACE_CONTEXT_LEN ? text.slice(0, MAX_WORKSPACE_CONTEXT_LEN) + '…' : text;
  } catch {
    return '';
  }
}
