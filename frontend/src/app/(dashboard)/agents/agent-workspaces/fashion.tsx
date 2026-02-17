'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shirt, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CLOSET_STORAGE_KEY = 'aimall_agent_fashion_closet';

interface ClosetItem {
  id: string;
  name: string;
  color: string;
  category: string;
}

export function FashionWorkspace() {
  const [closet, setCloset] = useState<ClosetItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(CLOSET_STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const saveCloset = useCallback((items: ClosetItem[]) => {
    setCloset(items);
    if (typeof window !== 'undefined') localStorage.setItem(CLOSET_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const addItem = () => {
    const name = newName.trim();
    if (!name) { toast.error('نام آیتم را وارد کنید'); return; }
    const item: ClosetItem = { id: crypto.randomUUID(), name, color: newColor.trim() || '-', category: newCategory || 'سایر' };
    saveCloset([...closet, item]);
    setNewName(''); setNewColor(''); setNewCategory('');
    toast.success('به کمد اضافه شد');
  };

  const removeItem = (id: string) => {
    saveCloset(closet.filter((i) => i.id !== id));
    toast.success('حذف شد');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shirt className="h-4 w-4" /> کمد دیجیتال</CardTitle>
          <CardDescription>لیست آیتم‌های خود را اضافه کنید (فقط ذخیره محلی)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="نام آیتم" value={newName} onChange={(e) => setNewName(e.target.value)} className="max-w-[200px]" />
            <Input placeholder="رنگ" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="max-w-[120px]" />
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="دسته" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="بالا">بالا</SelectItem>
                <SelectItem value="پایین">پایین</SelectItem>
                <SelectItem value="کفش">کفش</SelectItem>
                <SelectItem value="اکسسوری">اکسسوری</SelectItem>
                <SelectItem value="لباس رسمی">لباس رسمی</SelectItem>
                <SelectItem value="سایر">سایر</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 me-1" /> افزودن</Button>
          </div>
          {closet.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">هنوز آیتمی اضافه نشده.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {closet.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0 text-sm">
                  <span><span className="font-medium">{i.name}</span> - {i.color} ({i.category})</span>
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
          <CardTitle className="text-base">ست‌ساز</CardTitle>
          <CardDescription>مناسبت و سبک را در تب چت از دستیار بخواهید.</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
