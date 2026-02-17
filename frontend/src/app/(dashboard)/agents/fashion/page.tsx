'use client';

import { AgentChatPage } from '../agent-chat-shared';

const CONFIG = {
  agentId: 'fashion',
  titleFa: 'فشن و مد',
  descriptionFa: 'ساخت ست، مشاوره استایل، تحلیل عکس، خرید هوشمند و کمد دیجیتال',
  chipsFa: ['تحلیل عکس', 'ست‌ساز', 'کمد دیجیتال'],
  quickActions: [
    { label: 'ست امروز', text: 'با توجه به آب و هوا و موقعیت امروز یک ست پیشنهاد بده.' },
    { label: 'ست برای مناسبت', text: 'برای یک مناسبت رسمی/نیمه‌رسمی/دوستانه یک ست پیشنهاد بده.' },
    { label: 'تحلیل عکس', text: 'این عکس از استایل من را تحلیل کن و پیشنهاد بهبود بده.' },
    { label: 'با لباس‌های کمدم ست بساز', text: 'با توجه به لباس‌هایی که در کمد دارم چند ست پیشنهاد بده.' },
    { label: 'لیست خرید تکمیل کمد', text: 'برای تکمیل کمدم یک لیست خرید پیشنهاد بده.' },
  ],
};

export default function FashionPage() {
  return <AgentChatPage config={CONFIG} />;
}
