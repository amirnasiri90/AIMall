'use client';
import React from 'react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import type { SavedProfile, Message } from './fitness-diet-view';
import { FitnessDietView } from './fitness-diet-view';

const PROFILE_STORAGE_KEY = 'aimall-fitness-diet-profiles';
const AGENT_ID = 'fitness-diet';

export default function FitnessDietPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useAuthStore();

  const [level, setLevel] = useState('standard');
  const [style, setStyle] = useState('detailed');
  const [mode, setMode] = useState('fast');
  const [goal, setGoal] = useState('none');
  const [safetyMode, setSafetyMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [place, setPlace] = useState('none');
  const [timePerDay, setTimePerDay] = useState('none');
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [profileNameToSave, setProfileNameToSave] = useState('');

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamMeta, setStreamMeta] = useState<{ model?: string; coinCost?: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: dbMessages, isLoading: msgsLoading } = useQuery({
    queryKey: ['agent-messages', AGENT_ID, conversationId],
    queryFn: () => api.getAgentMessages(AGENT_ID, conversationId!),
    enabled: !!conversationId,
  });

  const allMessages: Message[] = useMemo(() => {
    if (dbMessages && dbMessages.length > 0) return dbMessages;
    return localMessages;
  }, [dbMessages, localMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, streamText]);

  const startNewSession = useCallback(async () => {
    try {
      const conv = await api.createAgentConversation(AGENT_ID, undefined, currentOrganizationId);
      setConversationId(conv.id);
      setLocalMessages([]);
      setStreamText('');
      setStreamMeta(null);
      queryClient.invalidateQueries({ queryKey: ['agent-conversations', AGENT_ID] });
      toast.success('جلسه جدید شروع شد');
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [queryClient, currentOrganizationId]);

  const getCurrentSettings = useCallback(() => ({
    level,
    style,
    mode,
    goal,
    safetyMode,
    place,
    timePerDay,
  }), [level, style, mode, goal, safetyMode, place, timePerDay]);

  const saveCurrentProfile = useCallback(() => {
    const name = profileNameToSave.trim() || `پروفایل ${new Date().toLocaleDateString('fa-IR')}`;
    const list: SavedProfile[] = [
      ...savedProfiles,
      {
        id: crypto.randomUUID(),
        name,
        savedAt: Date.now(),
        settings: getCurrentSettings(),
      },
    ];
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(list));
    setSavedProfiles(list);
    setProfileNameToSave('');
    toast.success(`«${name}» ذخیره شد`);
  }, [savedProfiles, getCurrentSettings, profileNameToSave]);

  const loadProfile = useCallback((p: SavedProfile) => {
    const s = p.settings;
    setLevel(s.level);
    setStyle(s.style);
    setMode(s.mode);
    setGoal(s.goal);
    setSafetyMode(s.safetyMode);
    setPlace(s.place || 'none');
    setTimePerDay(s.timePerDay || 'none');
    toast.success(`«${p.name}» بارگذاری شد`);
  }, []);

  const deleteProfile = useCallback((id: string) => {
    const list = savedProfiles.filter((x) => x.id !== id);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(list));
    setSavedProfiles(list);
    toast.success('پروفایل حذف شد');
  }, [savedProfiles]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? message).trim();
    if (!text || streaming) return;

    let convId = conversationId;
    if (!convId) {
      try {
        const conv = await api.createAgentConversation(AGENT_ID, undefined, currentOrganizationId);
        convId = conv.id;
        setConversationId(conv.id);
        queryClient.invalidateQueries({ queryKey: ['agent-conversations', AGENT_ID] });
      } catch (err: any) {
        toast.error(err.message);
        return;
      }
    }

    const msg = text;
    if (!overrideText) setMessage('');
    setStreaming(true);
    setStreamText('');
    setStreamMeta(null);

    const userMsg: Message = { id: `tmp-${Date.now()}`, role: 'user', content: msg };
    setLocalMessages((prev) => [...prev, userMsg]);

    try {
      const url = api.agentStreamUrl(AGENT_ID, convId!, msg, {
        level,
        style,
        mode,
        subject: goal !== 'none' ? goal : undefined,
        integrityMode: safetyMode,
        place: place !== 'none' ? place : undefined,
        timePerDay: timePerDay !== 'none' ? timePerDay : undefined,
      });

      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'delta') {
            setStreamText((prev) => prev + (data.content || ''));
          } else if (data.type === 'usage') {
            setStreamMeta({ model: data.model, coinCost: data.coinCost });
          } else if (data.type === 'done') {
            eventSource.close();
            setStreaming(false);
            setStreamText('');
            queryClient.invalidateQueries({ queryKey: ['agent-messages', AGENT_ID, convId] });
          } else if (data.type === 'error') {
            toast.error(data.message || 'خطا');
            eventSource.close();
            setStreaming(false);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        eventSource.close();
        setStreaming(false);
        toast.error('خطا در ارتباط با سرور');
      };
    } catch (err: any) {
      toast.error(err.message);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(undefined);
    }
  };

  const runQuickPrompt = (text: string) => {
    sendMessage(text);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const vm = {
    level, setLevel, style, setStyle, mode, setMode, goal, setGoal,
    safetyMode, setSafetyMode, settingsOpen, setSettingsOpen,
    place, setPlace, timePerDay, setTimePerDay,
    savedProfiles, profileNameToSave, setProfileNameToSave,
    allMessages, streaming, streamText, streamMeta, copiedId,
    message, setMessage, sendMessage, copyMessage, runQuickPrompt, handleKeyDown,
    startNewSession, saveCurrentProfile, loadProfile, deleteProfile,
    messagesEndRef, textareaRef, msgsLoading, router,
  };

  return React.createElement(FitnessDietView, { vm });
}
