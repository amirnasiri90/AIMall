'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const BRAND_KIT_KEY = 'aimall_agent_instagram_brandkit';
const MACRO_REPLIES_KEY = 'aimall_agent_instagram_macro_replies';

interface BrandKit {
  name: string;
  domain: string;
  tone: string;
  forbiddenWords: string;
  keywords: string;
}

export function InstagramWorkspace() {
  const [brandKit, setBrandKit] = useState<BrandKit>(() => {
    if (typeof window === 'undefined') return { name: '', domain: '', tone: '', forbiddenWords: '', keywords: '' };
    try {
      return JSON.parse(localStorage.getItem(BRAND_KIT_KEY) || '{}');
    } catch { return { name: '', domain: '', tone: '', forbiddenWords: '', keywords: '' }; }
  });
  const [macroReplies, setMacroReplies] = useState<{ id: string; name: string; text: string }[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(MACRO_REPLIES_KEY) || '[]');
    } catch { return []; }
  });
  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroText, setNewMacroText] = useState('');

  const saveBrandKit = useCallback((v: Partial<BrandKit>) => {
    const next = { ...brandKit, ...v };
    setBrandKit(next);
    if (typeof window !== 'undefined') localStorage.setItem(BRAND_KIT_KEY, JSON.stringify(next));
  }, [brandKit]);

  const saveMacros = useCallback((list: { id: string; name: string; text: string }[]) => {
    setMacroReplies(list);
    if (typeof window !== 'undefined') localStorage.setItem(MACRO_REPLIES_KEY, JSON.stringify(list));
  }, []);

  const addMacro = () => {
    const name = newMacroName.trim();
    const text = newMacroText.trim();
    if (!name || !text) {
      toast.error('نام و متن پاسخ را وارد کنید');
      return;
    }
    saveMacros([...macroReplies, { id: crypto.randomUUID(), name, text }]);
    setNewMacroName('');
    setNewMacroText('');
    toast.success('پاسخ ذخیره شد');
  };

  const removeMacro = (id: string) => {
    saveMacros(macroReplies.filter((m) => m.id !== id));
    toast.success('حذف شد');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" /> برند کیت (Brand Kit)
          </CardTitle>
          <CardDescription>نام برند، حوزه، لحن و کلمات کلیدی/ممنوع را ثبت کنید تا دستیار با لحن برند پاسخ بدهد.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">نام برند</Label>
              <Input
                value={brandKit.name}
                onChange={(e) => saveBrandKit({ name: e.target.value })}
                placeholder="مثلاً فروشگاه X"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">حوزه فعالیت</Label>
              <Input
                value={brandKit.domain}
                onChange={(e) => saveBrandKit({ domain: e.target.value })}
                placeholder="مثلاً مد و پوشاک"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">لحن برند</Label>
              <Input
                value={brandKit.tone}
                onChange={(e) => saveBrandKit({ tone: e.target.value })}
                placeholder="مثلاً دوستانه، حرفه‌ای، جوان"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">کلمات ممنوع</Label>
              <Input
                value={brandKit.forbiddenWords}
                onChange={(e) => saveBrandKit({ forbiddenWords: e.target.value })}
                placeholder="با کاما جدا کنید"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">کلمات کلیدی</Label>
              <Input
                value={brandKit.keywords}
                onChange={(e) => saveBrandKit({ keywords: e.target.value })}
                placeholder="با کاما جدا کنید"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> تقویم محتوا
          </CardTitle>
          <CardDescription>نمای ساده؛ برای ایده‌های هفتگی/ماهانه از تب چت و دکمه «ایده هفته» یا «تقویم ماهانه» استفاده کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">تقویم شمسی کامل در نسخه‌های بعدی اضافه می‌شود. فعلاً از دستیار در تب چت بخواهید.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">پاسخ‌های آماده (Macro Replies)</CardTitle>
          <CardDescription>پاسخ‌های از پیش نوشته برای دایرکت/کامنت (فقط ذخیره محلی).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="نام پاسخ (مثلاً تشکر از پیام)"
              value={newMacroName}
              onChange={(e) => setNewMacroName(e.target.value)}
              className="max-w-[240px]"
            />
            <Textarea
              placeholder="متن پاسخ..."
              value={newMacroText}
              onChange={(e) => setNewMacroText(e.target.value)}
              className="min-h-[80px]"
            />
            <Button size="sm" onClick={addMacro}>
              <Plus className="h-3.5 w-3.5 me-1" /> افزودن
            </Button>
          </div>
          {macroReplies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">هنوز پاسخی ذخیره نشده.</p>
          ) : (
            <ul className="space-y-2">
              {macroReplies.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.text}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeMacro(m.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
