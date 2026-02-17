'use client';

import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { IconRail } from './IconRail';
import { ChatResultsPanel } from './ChatResultsPanel';
import { ChatPanel } from './ChatPanel';
import { MOCK_CHATS } from '@/lib/genie-mock';
import type { ChatThread } from '@/lib/genie-mock';
import { cn } from '@/lib/utils';

export function GenieChat() {
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null);
  const [isNewChat, setIsNewChat] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(false);

  const handleNewChat = useCallback(() => {
    setIsNewChat(true);
    setSelectedChat(null);
    setResultsOpen(false);
  }, []);

  const handleSelectChat = useCallback((chat: ChatThread) => {
    setSelectedChat(chat);
    setIsNewChat(false);
    setResultsOpen(false);
  }, []);

  const toggleResults = useCallback(() => setResultsOpen((o) => !o), []);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#F2EFFF] via-[#F7F4FF] to-[#EEF8F1]">
      <div className="flex flex-1 min-h-0 p-4 gap-4">
        <IconRail onNewChat={handleNewChat} />
        <div className="flex-1 flex min-w-0 gap-4 rounded-[32px] overflow-hidden">
          <div
            className={cn(
              'flex flex-col w-full md:w-[360px] flex-shrink-0 min-h-0',
              'absolute md:relative inset-0 z-20 md:z-auto',
              resultsOpen ? 'flex' : 'hidden md:flex'
            )}
          >
            <ChatResultsPanel
              chats={MOCK_CHATS}
              selectedId={isNewChat ? null : selectedChat?.id ?? null}
              onSelect={handleSelectChat}
              onNewChat={handleNewChat}
              onToggleCollapse={toggleResults}
            />
          </div>
          {resultsOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-10 md:hidden"
              onClick={() => setResultsOpen(false)}
              aria-hidden
            />
          )}
          <div className="flex-1 flex flex-col min-w-0 relative">
            <button
              type="button"
              onClick={toggleResults}
              className="md:hidden absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-white/60 backdrop-blur border border-white/40 flex items-center justify-center shadow-sm"
              aria-label="Open chat list"
            >
              <Menu className="w-4 h-4 text-gray-600" />
            </button>
            <ChatPanel chat={selectedChat} isNewChat={isNewChat} onClose={toggleResults} />
          </div>
        </div>
      </div>
    </div>
  );
}
