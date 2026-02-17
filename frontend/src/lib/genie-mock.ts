export type ChatSection = 'today' | 'yesterday';

export type ChatPreviewType = 'image-card' | 'pill-list';

export interface ChatThread {
  id: string;
  title: string;
  section: ChatSection;
  dateLabel: string;
  previewType: ChatPreviewType;
  /** For image-card: image gradient + subtitle */
  imageSubtitle?: string;
  imageCaption?: string;
  avatarCount?: number;
  /** For pill-list: row of query pills */
  pills?: string[];
  messages: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  title?: string;
  attachments?: { label: string; type: 'file' | 'link' }[];
}

export const MOCK_CHATS: ChatThread[] = [
  {
    id: '1',
    title: 'Image Generation',
    section: 'today',
    dateLabel: 'Today, 10:30 AM',
    previewType: 'image-card',
    imageSubtitle: 'Parrot images',
    imageCaption: 'Generated 4 colorful parrot variations for the campaign.',
    avatarCount: 3,
    messages: [
      { id: 'm1', role: 'assistant', content: 'Hi, Marry!', title: 'How can I help you?' },
      {
        id: 'm2',
        role: 'user',
        content: 'I need 4 different parrot images for our tropical campaign, bright colors.',
        attachments: [
          { label: 'brief.pdf', type: 'file' },
          { label: 'brand-guide.pdf', type: 'file' },
        ],
      },
      {
        id: 'm3',
        role: 'assistant',
        content: 'Here’s what I created:\n1. Parrot on branch – sunset background\n2. Flying parrot – blue sky\n3. Close-up portrait – green foliage\n4. Stylized vector – flat design',
      },
    ],
  },
  {
    id: '2',
    title: 'AI Search',
    section: 'yesterday',
    dateLabel: 'Yesterday, 4:15 PM',
    previewType: 'pill-list',
    pills: ['How to decrease CAC?', 'How to increase LTV?', 'Best CRM for SMB?'],
    messages: [
      { id: 'm4', role: 'assistant', content: 'Hello!', title: 'What would you like to search?' },
      { id: 'm5', role: 'user', content: 'How to decrease CAC?' },
      {
        id: 'm6',
        role: 'assistant',
        content: 'To decrease CAC: 1) Improve targeting 2) Optimize landing pages 3) Use referral programs 4) Retarget abandoned carts.',
      },
    ],
  },
];

export const MOCK_QUICK_ACTIONS = [
  { id: 'files', label: 'Chat Files', icon: 'FileText' },
  { id: 'images', label: 'Images', icon: 'Image' },
  { id: 'translate', label: 'Translate', icon: 'Languages' },
  { id: 'audio', label: 'Audio Chat', icon: 'Mic' },
];

export function getMockReply(): Message {
  return {
    id: `mock-${Date.now()}`,
    role: 'assistant',
    content: 'Thanks for your message! This is a mock reply. In production, the AI would respond here.',
  };
}
