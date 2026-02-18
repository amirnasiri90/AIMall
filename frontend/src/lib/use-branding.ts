'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** آیکون پیش‌فرض وقتی از API برندینگ لوگی آپلود نشده — از لوگوی قدیمی سایت لینک نمی‌گیریم */
const defaultLogoDataUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🤖%3C/text%3E%3C/svg%3E";

/** آدرس لوگوی هدر/سایدبار؛ فقط از API برندینگ (آپلود از پنل ادمین) یا دادهٔ پیش‌فرض */
export function useLogoUrl(): string {
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: api.getBranding,
  });
  return branding?.logo ?? defaultLogoDataUrl;
}
