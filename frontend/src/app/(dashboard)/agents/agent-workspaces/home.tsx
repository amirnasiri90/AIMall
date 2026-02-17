'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PANTRY_STORAGE_KEY = 'aimall_agent_home_pantry';

interface PantryItem {
  id: string;
  name: string;
  expiry?: string;
}

export function HomeWorkspace() {
  const [pantry, setPantry] = useState<PantryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(PANTRY_STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [newName, setNewName] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [filterNearExpiry, setFilterNearExpiry] = useState(false);

  const savePantry = useCallback((items: PantryItem[]) => {
    setPantry(items);
    if (typeof window !== 'undefined') localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const addItem = () => {
    const name = newName.trim();
    if (!name) { toast.error('نام ماده را وارد کنید'); return; }
    savePantry([...pantry, { id: crypto.randomUUID(), name, expiry: newExpiry || undefined }]);
    setNewName(''); setNewExpiry('');
    toast.success('اضافه شد');
  };

  const removeItem = (id: string) => {
    savePantry(pantry.filter((i) => i.id !== id));
    toast.success('حذف شد');
  };

  const now = new Date();
  const nearExpiryDays = 7;
  const itemsToShow = filterNearExpiry
    ? pantry.filter((i) => {
        if (!i.expiry) return false;
        const exp = new Date(i.expiry);
        const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= nearExpiryDays;
      })
    : pantry;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" /> یخچال / انباری</CardTitle>
          <CardDescription>مواد موجود را ثبت کنید. با «نزدیک انقضا» فقط مواردی که تا ۷ روز منقضی می‌شوند نمایش داده می‌شوند.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <Input placeholder="نام ماده" value={newName} onChange={(e) => setNewName(e.target.value)} className="max-w-[200px]" />
            <div>
              <Label className="text-xs">تاریخ انقضا</Label>
              <Input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="mt-1 max-w-[160px]" />
            </div>
            <Button size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 me-1" /> افزودن</Button>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="nearExpiry" checked={filterNearExpiry} onChange={(e) => setFilterNearExpiry(e.target.checked)} className="rounded" />
            <Label htmlFor="nearExpiry">فقط نزدیک انقضا (۷ روز)</Label>
          </div>
          {itemsToShow.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{filterNearExpiry ? 'موردی نزدیک انقضا نیست.' : 'هنوز ماده‌ای اضافه نشده.'}</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {itemsToShow.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0 text-sm">
                  <span>{i.name}{i.expiry && <span className="text-muted-foreground me-2">- انقضا: {i.expiry}</span>}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i.id)} aria-label="حذف">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">دستور پخت مرحله‌ای</CardTitle>
          <CardDescription>از تب چت با دکمه «دستور پخت مرحله‌ای» یا «با موادم غذا پیشنهاد بده» استفاده کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4" /> خروجی مرحله‌به‌مرحله در تب چت نمایش داده می‌شود.</p>
        </CardContent>
      </Card>
    </div>
  );
}
