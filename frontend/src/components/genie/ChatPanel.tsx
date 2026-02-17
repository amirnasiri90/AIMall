'use client';

import { useState, useCallback, useEffect } from 'react';
import { Sparkles, X, ArrowUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { QuickActions } from './QuickActions';
import type { Message, ChatThread } from '@/lib/genie-mock';
import { getMockReply } from '@/lib/genie-mock';

interface ChatPanelProps {
  chat: ChatThread | null;
  isNewChat: boolean;
  onClose?: () => void;
}

export function ChatPanel({ chat, isNewChat, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => (isNewChat ? [] : (chat?.messages ?? [])));
  const [input, setInput] = useState('');

  useEffect(() => {
    if (isNewChat) setMessages([]);
    else if (chat) setMessages(chat.messages);
  }, [chat?.id, isNewChat]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const reply = getMockReply();
    setTimeout(() => setMessages((prev) => [...prev, reply]), 600);
  }, [input]);

  const title = isNewChat ? 'New Chat' : (chat?.title ?? 'Chat');

  return (
    <main className="flex-1 flex flex-col min-w-0 rounded-[28px] bg-white/45 backdrop-blur-xl border border-white/40 border-l-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-black/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2C81EB]/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#2C81EB]" />
          </div>
          <h1 className="font-semibold text-gray-800">{title}</h1>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-6">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No messages yet. Type below to start.</p>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-black/5 flex-shrink-0">
        <div className="rounded-[24px] bg-white/50 backdrop-blur-xl border border-white/40 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <QuickActions />
          <div className="flex items-end gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask me anything…"
              className="flex-1 min-h-[44px] rounded-2xl bg-white/60 border border-white/50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C81EB]/30"
            />
            <button
              type="button"
              onClick={handleSend}
              className="w-11 h-11 rounded-full bg-[#2C81EB] text-white flex items-center justify-center hover:bg-[#2570d4] transition-colors flex-shrink-0"
              aria-label="Send"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
