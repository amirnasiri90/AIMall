'use client';

import { AgentChatPage } from '../agent-chat-shared';

const CONFIG = {
  agentId: 'lifestyle',
  titleFa: 'سبک زندگی و روتین روزانه',
  descriptionFa: 'برنامه‌ریزی روزانه، تسک‌ها، روتین و پیگیری عادت',
  chipsFa: ['تسک‌ها', 'برنامه روزانه', 'یادآور'],
  quickActions: [
    { label: 'برنامه امروز منو بچین', text: 'با توجه به زمان آزاد و اولویت‌های من برنامه امروز را پیشنهاد بده.' },
    { label: 'ایجاد تسک', text: 'به من کمک کن یک تسک را به‌درستی تعریف و اولویت‌بندی کنم.' },
    { label: 'ساخت روتین صبح', text: 'یک روتین صبحگاهی کوتاه و قابل اجرا پیشنهاد بده.' },
    { label: 'پیگیری عادت', text: 'چطور یک عادت جدید را ثبت و پیگیری کنم؟' },
    { label: 'مرور هفته', text: 'یک چک‌لیست مرور هفتگی برای من بساز.' },
  ],
};

export default function LifestylePage() {
  return <AgentChatPage config={CONFIG} />;
}
