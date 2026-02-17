'use client';

import { Paperclip, Link, MoreHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/genie-mock';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8E4FF] to-[#DCE8CD] flex items-center justify-center flex-shrink-0 border border-white/60">
          <Sparkles className="w-4 h-4 text-[#2C81EB]" />
        </div>
      )}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-[20px] px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)]',
            isUser
              ? 'bg-white/60 backdrop-blur border border-white/40'
              : 'bg-white/50 backdrop-blur border border-white/40'
          )}
        >
          {message.title && <p className="text-sm font-semibold text-gray-800 mb-1">{message.title}</p>}
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</p>
        </div>
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap justify-end">
            {message.attachments.map((a) => (
              <div
                key={a.label}
                className="px-3 py-2 rounded-xl bg-white/50 border border-white/40 text-xs text-gray-600 flex items-center gap-1.5"
              >
                <span className="truncate max-w-[100px]">{a.label}</span>
              </div>
            ))}
          </div>
        )}
        {isUser && (
          <div className="flex items-center gap-1 mt-1">
            <button type="button" className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-gray-600">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-gray-600">
              <Link className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
