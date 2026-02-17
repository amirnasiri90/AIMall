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

const DEFAULT_MESSAGE = `
آپدیت جدید پنل اعمال شد.
ویژگی‌ها و بهبودهای جدید در بخش‌های چت، دستیارها، استودیوها و تنظیمات در دسترس هستند.
`;

export function UpdateNotice() {
  const [open, setOpen] = useState(false);
  const [releaseId, setReleaseId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    fetch('/release.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { releaseId?: string } | null) => {
        if (cancelled) return;
        const id = data?.releaseId ?? '0';
        setReleaseId(id);
        const seen = localStorage.getItem(STORAGE_KEY);
        if (id && id !== seen) setOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        setReleaseId('0');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
    if (releaseId && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, releaseId);
    }
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o && releaseId && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, releaseId);
    }
  };

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
