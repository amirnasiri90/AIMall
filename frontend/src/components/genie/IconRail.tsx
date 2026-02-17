'use client';

import { Plus, MessageSquare, Search, Settings, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = [
  { id: 'chat', Icon: MessageSquare, active: true },
  { id: 'search', Icon: Search, active: false },
  { id: 'sparkles', Icon: Sparkles, active: false },
  { id: 'settings', Icon: Settings, active: false },
];

interface IconRailProps {
  onNewChat?: () => void;
}

export function IconRail({ onNewChat }: IconRailProps) {
  return (
    <aside className="w-[72px] flex-shrink-0 flex flex-col items-center py-4 gap-6 bg-white/45 backdrop-blur-xl border border-white/40 border-r-black/5 rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
      <button
        type="button"
        onClick={onNewChat}
        className="w-10 h-10 rounded-full bg-[#2C81EB] text-white flex items-center justify-center hover:bg-[#2570d4] transition-colors"
        aria-label="New"
      >
        <Plus className="w-5 h-5" />
      </button>
      <nav className="flex flex-col gap-2">
        {ICONS.map(({ id, Icon, active }) => (
          <button
            key={id}
            type="button"
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
              active ? 'bg-[#2C81EB] text-white' : 'text-gray-400 hover:bg-black/5 hover:text-gray-600'
            )}
            aria-label={id}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8E4FF] to-[#DCE8CD] flex items-center justify-center border border-white/60 shadow-sm">
          <User className="w-4 h-4 text-gray-600" />
        </div>
      </div>
    </aside>
  );
}
