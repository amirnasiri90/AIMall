'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { normalizePhone, isValidIranMobile } from '@/lib/phone';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Key, User, Pencil, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const APP_VERSION = '1.0.0';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  const startEdit = () => {
    setForm({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setForm({ name: '', phone: '' });
    setEditing(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    const phoneTrimmed = form.phone.trim();
    if (phoneTrimmed && !isValidIranMobile(phoneTrimmed)) {
      toast.error('شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        name: form.name.trim() || undefined,
        phone: phoneTrimmed ? normalizePhone(phoneTrimmed) : undefined,
      });
      const me = await api.getMe();
      setUser(me);
      toast.success('اطلاعات با موفقیت ذخیره شد');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err: any) {
      toast.error(err.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6 max-w-2xl">
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">تنظیمات</h1>
          <p className="text-muted-foreground mt-1">مدیریت حساب کاربری</p>
        </div>
        <p className="text-sm text-muted-foreground">نسخه {APP_VERSION}</p>
      </div>

      {/* اطلاعات کاربری — قابل تکمیل و ویرایش */}
      <Card>
        <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2 flex-row-reverse">
            <User className="h-5 w-5 text-muted-foreground shrink-0" />
            <CardTitle>اطلاعات کاربری</CardTitle>
          </div>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4 me-2" />
              ویرایش
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4 me-2" />
                انصراف
              </Button>
              <Button size="sm" onClick={saveProfile} disabled={saving} aria-busy={saving}>
                {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Check className="h-4 w-4 me-2" />}
                ذخیره
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">نام</Label>
              {editing ? (
                <Input
                  id="profile-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="نام شما"
                />
              ) : (
                <Input value={user.name || '—'} disabled className="bg-muted/50" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">شماره موبایل</Label>
              {editing ? (
                <Input
                  id="profile-phone"
                  value={form.phone}
                  onChange={(e) => {
                    const digits = normalizePhone(e.target.value).replace(/\D/g, '').slice(0, 11);
                    setForm((f) => ({ ...f, phone: digits }));
                  }}
                  placeholder="09123456789"
                  dir="ltr"
                  className="text-left"
                />
              ) : (
                <Input value={user.phone || '—'} disabled className="bg-muted/50" dir="ltr" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>ایمیل</Label>
            <Input value={user.email || '—'} disabled dir="ltr" className="bg-muted/50 text-left" />
            <p className="text-xs text-muted-foreground">ایمیل برای ورود استفاده می‌شود و قابل تغییر از این بخش نیست.</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Label className="shrink-0">نقش</Label>
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
              {user.role === 'ADMIN' ? 'مدیر' : 'کاربر'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* تنظیمات API — بزودی */}
      <Card className={cn('opacity-90')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-row-reverse">
            تنظیمات API
            <Badge variant="secondary" className="text-xs font-normal">بزودی</Badge>
          </CardTitle>
          <CardDescription>آدرس سرور API و تنظیمات پیشرفته در نسخه‌های بعد در دسترس خواهد بود.</CardDescription>
        </CardHeader>
      </Card>

      {/* کلیدهای API — بزودی */}
      <Card className={cn('opacity-90')}>
        <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0">
          <div className="text-right">
            <CardTitle className="flex items-center gap-2 flex-row-reverse">
              <Key className="h-5 w-5 shrink-0" />
              کلیدهای API
              <Badge variant="secondary" className="text-xs font-normal">بزودی</Badge>
            </CardTitle>
            <CardDescription>برای دسترسی برنامه‌نویسی (اپ، اسکریپت) از کلید API استفاده کنید.</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
