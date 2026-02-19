'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const STORAGE_KEY = 'aimall_seen_release_id';

const DEFAULT_MESSAGE = `آپدیت جدید پنل اعمال شد.

• اصلاح دکمه تم روشن/تیره در نسخه موبایل
• نمایش پیام آپدیت فقط یک‌بار تا آپدیت بعدی
• حذف گزینه شارژ آزمایشی از صورتحساب
• ویجت سرچ «میخوای چه کار کنی؟» برای صفحهٔ اصلی (بدون API و شماره)`;

export function UpdateNotice() {
  const [open, setOpen] = useState(false);
  const [releaseId, setReleaseId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    fetch('/api/release', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { releaseId?: string } | null) => {
        if (cancelled) return;
        const id = data?.releaseId ?? '0';
        setReleaseId(id);
        const seen = localStorage.getItem(STORAGE_KEY);
        // فقط یک‌بار تا آپدیت بعدی: اگر این نسخه را ندیده، نشان بده و بلافاصله در ذخیره‌گاه علامت بزن
        if (id && id !== seen) {
          setOpen(true);
          localStorage.setItem(STORAGE_KEY, id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setReleaseId('0');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = () => setOpen(false);

  const handleOpenChange = (o: boolean) => setOpen(o);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            آپدیت جدید
          </DialogTitle>
          <DialogDescription className="text-right whitespace-pre-line pt-1">
            {DEFAULT_MESSAGE.trim()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={handleClose}>
            متوجه شدم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
