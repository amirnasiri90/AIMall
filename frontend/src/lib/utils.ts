import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n);
}

export function formatPrice(priceIRR: number) {
  return new Intl.NumberFormat('fa-IR').format(priceIRR) + ' ریال';
}

export function formatTime(date: string | Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}
