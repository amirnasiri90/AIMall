'use client';

import { ChevronLeft, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatThread } from '@/lib/genie-mock';

interface ChatResultsPanelProps {
  chats: ChatThread[];
  selectedId: string | null;
  onSelect: (chat: ChatThread) => void;
  onNewChat: () => void;
  onToggleCollapse?: () => void;
}

export function ChatResultsPanel({
  chats,
  selectedId,
  onSelect,
  onNewChat,
  onToggleCollapse,
}: ChatResultsPanelProps) {
  const today = chats.filter((c) => c.section === 'today');
  const yesterday = chats.filter((c) => c.section === 'yesterday');

  return (
    <aside className="flex flex-col w-full md:w-[360px] h-full flex-shrink-0 rounded-[28px] bg-white/45 backdrop-blur-xl border border-white/40 border-r-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden min-h-0">
      <header className="flex items-center gap-2 p-4 border-b border-black/5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="md:hidden w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="flex-1 text-center font-semibold text-gray-800">Chat Results</h2>
        <button
          type="button"
          onClick={onNewChat}
          className="text-sm font-medium text-[#2C81EB] hover:underline"
        >
          New Chat
        </button>
      </header>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {today.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Today</p>
              <div className="space-y-3">
                {today.map((chat) => (
                  <ChatResultCard
                    key={chat.id}
                    chat={chat}
                    selected={selectedId === chat.id}
                    onSelect={() => onSelect(chat)}
                  />
                ))}
              </div>
            </section>
          )}
          {yesterday.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Yesterday</p>
              <div className="space-y-3">
                {yesterday.map((chat) => (
                  <ChatResultCard
                    key={chat.id}
                    chat={chat}
                    selected={selectedId === chat.id}
                    onSelect={() => onSelect(chat)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function ChatResultCard({
  chat,
  selected,
  onSelect,
}: {
  chat: ChatThread;
  selected: boolean;
  onSelect: () => void;
}) {
  const isImageCard = chat.previewType === 'image-card';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-[24px] p-4 transition-all hover:shadow-md',
        selected && 'ring-2 ring-[#2C81EB]/50',
        isImageCard
          ? 'bg-gradient-to-br from-[#F3EAE6] to-[#DCE8CD] border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.08)]'
          : 'bg-white/60 backdrop-blur border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
      )}
    >
      <p className="font-semibold text-gray-800">{chat.title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{chat.dateLabel}</p>
      {isImageCard ? (
        <div className="mt-3 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100 to-emerald-100 h-28 flex items-center justify-center">
          <ImageIcon className="w-10 h-10 text-gray-400" />
        </div>
      ) : null}
      {chat.imageSubtitle && <p className="text-sm font-medium text-gray-700 mt-2">{chat.imageSubtitle}</p>}
      {chat.imageCaption && <p className="text-xs text-gray-500 mt-0.5">{chat.imageCaption}</p>}
      {chat.avatarCount != null && (
        <div className="flex items-center gap-1 mt-2">
          <div className="flex -space-x-2">
            {[1, 2].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white" />
            ))}
          </div>
          <span className="text-xs text-gray-500">+{chat.avatarCount}</span>
        </div>
      )}
      {chat.pills && chat.pills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {chat.pills.map((pill) => (
            <span
              key={pill}
              className="px-3 py-1.5 rounded-full bg-white/70 text-xs text-gray-600 border border-black/5 hover:bg-white/90"
            >
              {pill}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
