'use client';

import { useEffect } from 'react';

/**
 * در حالت PWA (standalone) viewport را قفل می‌کند و زوم را کاملاً غیرفعال می‌کند.
 */
export function PwaViewportLock() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window as Window & { navigator: { standalone?: boolean } }).navigator?.standalone === true;
    if (!isStandalone) return;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover'
    );
    document.documentElement.classList.add('pwa-standalone');
    return () => {
      document.documentElement.classList.remove('pwa-standalone');
    };
  }, []);
  return null;
}
