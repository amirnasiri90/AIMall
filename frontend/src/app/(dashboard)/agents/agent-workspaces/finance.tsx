'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Wallet, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const WATCHLIST_STORAGE_KEY = 'aimall_agent_finance_watchlist';

export function FinanceWorkspace() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [newSymbol, setNewSymbol] = useState('');
  const [currencyToggle, setCurrencyToggle] = useState<'toman' | 'rial'>('toman');

  const saveWatchlist = useCallback((items: string[]) => {
    setWatchlist(items);
    if (typeof window !== 'undefined') localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const addSymbol = () => {
    const s = newSymbol.trim().toUpperCase();
    if (!s) { toast.error('نماد یا نام دارایی را وارد کنید'); return; }
    if (watchlist.includes(s)) { toast.error('قبلاً اضافه شده'); return; }
    saveWatchlist([...watchlist, s]);
    setNewSymbol('');
    toast.success('اضافه شد');
  };

  const removeSymbol = (sym: string) => {
    saveWatchlist(watchlist.filter((x) => x !== sym));
    toast.success('حذف شد');
  };

  const tickerMock = [
    { label: 'دلار', value: currencyToggle === 'toman' ? '52,000' : '5,200,000' },
    { label: 'یورو', value: currencyToggle === 'toman' ? '56,000' : '5,600,000' },
    { label: 'طلا (گرم)', value: currencyToggle === 'toman' ? '2,800,000' : '280,000,000' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">نوار قیمت (نمایشی)</span>
          <Button variant="outline" size="sm" onClick={() => setCurrencyToggle((c) => (c === 'toman' ? 'rial' : 'toman'))}>
            {currencyToggle === 'toman' ? 'تومان' : 'ریال'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {tickerMock.map((t) => (
            <span key={t.label}><span className="text-muted-foreground">{t.label}:</span> <span className="font-medium">{t.value}</span></span>
          ))}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> واچ‌لیست</CardTitle>
          <CardDescription>نمادها یا دارایی‌های مورد نظر را اضافه کنید (فقط ذخیره محلی).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="نماد یا نام دارایی" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} className="max-w-[200px]" />
            <Button size="sm" onClick={addSymbol}><Plus className="h-3.5 w-3.5 me-1" /> افزودن</Button>
          </div>
          {watchlist.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">هنوز نمادی اضافه نشده.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {watchlist.map((sym) => (
                <li key={sym} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm">
                  <span>{sym}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSymbol(sym)} aria-label="حذف">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">سلب مسئولیت</p>
            <p className="text-xs text-muted-foreground mt-1">این دستیار مشاوره قطعی سرمایه‌گذاری ارائه نمی‌دهد. هر تصمیم با مسئولیت خود شماست.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
