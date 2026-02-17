'use client';

import { AgentChatPage } from '../agent-chat-shared';

const CONFIG = {
  agentId: 'instagram-admin',
  titleFa: 'یار ادمین اینستاگرام',
  descriptionFa: 'تقویم محتوا، سناریو ریلز، کپشن و هشتگ، پاسخ دایرکت با لحن برند',
  chipsFa: ['تقویم محتوا', 'ریلز', 'پاسخ‌گو', 'لحن برند'],
  quickActions: [
    { label: 'ایده هفته', text: 'چند ایده محتوای اینستاگرام برای این هفته با هدف و CTA پیشنهاد بده.' },
    { label: 'سناریو ریلز', text: 'یک سناریوی کوتاه برای ریلز اینستاگرام پیشنهاد بده.' },
    { label: 'کپشن + هشتگ', text: 'برای یک پست با موضوع مشخص کپشن و هشتگ پیشنهاد بده.' },
    { label: 'پاسخ دایرکت‌ها', text: 'چند پاسخ آماده برای دایرکت/کامنت با لحن دوستانه و حرفه‌ای بده.' },
    { label: 'تقویم ماهانه', text: 'یک تقویم محتوای ساده برای یک ماه با تنوع آموزشی/تعامل/فروش پیشنهاد بده.' },
  ],
};

export default function InstagramAdminPage() {
  return <AgentChatPage config={CONFIG} />;
}
