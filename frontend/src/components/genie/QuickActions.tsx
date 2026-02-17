'use client';

import { FileText, Image, Languages, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { id: 'files', label: 'Chat Files', Icon: FileText },
  { id: 'images', label: 'Images', Icon: Image },
  { id: 'translate', label: 'Translate', Icon: Languages },
  { id: 'audio', label: 'Audio Chat', Icon: Mic },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {ACTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-full',
            'bg-white/50 backdrop-blur border border-white/40 text-gray-700 text-sm font-medium',
            'hover:bg-white/70 hover:border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
            'transition-colors'
          )}
        >
          <Icon className="w-4 h-4 text-[#2C81EB]" />
          {label}
        </button>
      ))}
    </div>
  );
}
