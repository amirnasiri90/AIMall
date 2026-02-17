'use client';

import { useState, useEffect } from 'react';
import { X, Smartphone, Share, Plus, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'aimall_install_prompt_dismissed';

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileWidth = window.innerWidth <= 768;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return (mobileWidth && touch) || isMobileUA;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window as Window & { navigator: { standalone?: boolean } }).navigator?.standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function InstallPromptBanner() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isStandalone()) return;
    if (!isMobile()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }
    setShow(true);
  }, [mounted]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  };

  if (!show) return null;

  return (
    <div
      role="banner"
      aria-label="پیشنهاد نصب اپ"
      className="fixed bottom-0 left-0 right-0 z-[100] safe-area-inset-bottom p-3 animate-in slide-in-from-bottom duration-300"
    >
      <div className="max-w-lg mx-auto rounded-2xl shadow-xl border border-white/10 bg-gradient-to-b from-background/95 to-background/90 backdrop-blur-xl p-4 flex items-start gap-4 flex-row-reverse">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="font-semibold text-foreground">نصب اپ برای تجربهٔ بهتر</p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            {isIOS() ? (
              <>
                <div className="flex items-center gap-2">
                  <Share className="h-4 w-4 shrink-0 text-primary/80" />
                  <span>منوی <strong className="text-foreground font-medium">Share</strong> در نوار پایین را بزنید</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 shrink-0 text-primary/80" />
                  <span>گزینه <strong className="text-foreground font-medium">Add to Home Screen</strong> را انتخاب کنید</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Menu className="h-4 w-4 shrink-0 text-primary/80" />
                  <span>منوی مرورگر (⋮) را باز کنید</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 shrink-0 text-primary/80" />
                  <span><strong className="text-foreground font-medium">Install app</strong> یا <strong className="text-foreground font-medium">Add to Home Screen</strong> را بزنید</span>
                </div>
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={dismiss}
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
