'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  ImageIcon,
  Mic,
  Bot,
  BookOpen,
  GitBranch,
  CreditCard,
  LifeBuoy,
  Building2,
  Settings,
  Key,
  Sparkles,
  ArrowLeft,
  ListTodo,
  Code2,
  Shield,
  Shirt,
  Home,
  Wallet,
  CalendarCheck,
  Camera,
  GraduationCap,
  Dumbbell,
  MapPin,
  FileOutput,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { matchIntent, ALL_INTENT_HREFS, type IntentTarget } from '@/lib/intent-targets';
import { api } from '@/lib/api';

const ICON_BY_HREF: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/settings': Settings,
  '/settings/api-keys': Key,
  '/chat': MessageSquare,
  '/text-studio': FileText,
  '/image-studio': ImageIcon,
  '/audio-studio': Mic,
  '/agents': Bot,
  '/agents/student-tutor': GraduationCap,
  '/agents/fitness-diet': Dumbbell,
  '/agents/travel-tourism': MapPin,
  '/agents/fashion': Shirt,
  '/agents/home': Home,
  '/agents/finance': Wallet,
  '/agents/lifestyle': CalendarCheck,
  '/agents/instagram-admin': Camera,
  '/agents/persian-pdf-maker': FileOutput,
  '/billing': CreditCard,
  '/support': LifeBuoy,
  '/organizations': Building2,
  '/knowledge': BookOpen,
  '/workflows': GitBranch,
  '/jobs': ListTodo,
  '/developer': Code2,
  '/admin': Shield,
};

function IntentResult({ target, onClose }: { target: IntentTarget; onClose: () => void }) {
  const Icon = ICON_BY_HREF[target.href] ?? Sparkles;
  return (
    <div
      className="mt-4 rounded-xl border border-primary/30 bg-background/80 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl bg-primary/10 p-3 shrink-0">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-muted-foreground mb-0.5">به نظر می‌رسه می‌خوای:</p>
        <p className="font-semibold text-base">{target.label}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{target.desc}</p>
      </div>
      <Button asChild className="shrink-0 min-h-[44px]" size="sm" onClick={onClose}>
        <Link href={target.href}>
          <ArrowLeft className="h-4 w-4 ms-1" />
          ورود به بخش
        </Link>
      </Button>
    </div>
  );
}

export function IntentGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<IntentTarget | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setResult(null);
    setLoading(true);
    try {
      const aiResult = await api.classifyIntent(q);
      if (aiResult && aiResult.href) {
        setResult({ href: aiResult.href, label: aiResult.label, desc: aiResult.desc, keywords: [] });
        setLoading(false);
        return;
      }
    } catch {
      // خطای شبکه یا سرور؛ با کلیدواژه امتحان می‌کنیم
    }
    const matched = matchIntent(q, ALL_INTENT_HREFS);
    setResult(matched);
    if (!matched) toast.info('نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کنید یا از منو استفاده کنید.');
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setInput('');
      setResult(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            میخوای چه کار کنی؟
          </DialogTitle>
          <DialogDescription>
            از هر جای پنل می‌تونی اینجا بنویسی چی می‌خوای؛ بخش مناسب بهت پیشنهاد می‌شه — چت، دستیارها، مالی، پشتیبانی، تنظیمات و بقیه.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-2">
          <Input
            type="text"
            placeholder="مثال: میخوام سکه بخرم، تیکت بزنم، دستیار مالی..."
            value={input}
            onChange={(e) => { setInput(e.target.value); setResult(null); }}
            className="min-h-[44px]"
            aria-label="بنویس میخوای چه کار کنی"
          />
          <Button type="submit" className="min-h-[44px] w-full sm:w-auto" disabled={!input.trim() || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 ms-1 animate-spin" />
                در حال تحلیل...
              </>
            ) : (
              'تحلیل کن'
            )}
          </Button>
        </form>
        {result && <IntentResult target={result} onClose={() => handleOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
