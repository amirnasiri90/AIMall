'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarCheck, Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const TASKS_STORAGE_KEY = 'aimall_agent_lifestyle_tasks';
const HABITS_STORAGE_KEY = 'aimall_agent_lifestyle_habits';

type TaskStatus = 'todo' | 'doing' | 'done';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

interface Habit {
  id: string;
  name: string;
  count: number;
}

export function LifestyleWorkspace() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [habits, setHabits] = useState<Habit[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newHabitName, setNewHabitName] = useState('');
  const [freeTimeMinutes, setFreeTimeMinutes] = useState('');

  const saveTasks = useCallback((t: Task[]) => {
    setTasks(t);
    if (typeof window !== 'undefined') localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(t));
  }, []);
  const saveHabits = useCallback((h: Habit[]) => {
    setHabits(h);
    if (typeof window !== 'undefined') localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(h));
  }, []);

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) { toast.error('عنوان تسک را وارد کنید'); return; }
    saveTasks([...tasks, { id: crypto.randomUUID(), title, status: 'todo' }]);
    setNewTaskTitle('');
    toast.success('تسک اضافه شد');
  };

  const setTaskStatus = (id: string, status: TaskStatus) => {
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const removeTask = (id: string) => {
    saveTasks(tasks.filter((t) => t.id !== id));
  };

  const addHabit = () => {
    const name = newHabitName.trim();
    if (!name) { toast.error('نام عادت را وارد کنید'); return; }
    saveHabits([...habits, { id: crypto.randomUUID(), name, count: 0 }]);
    setNewHabitName('');
    toast.success('عادت اضافه شد');
  };

  const incrementHabit = (id: string) => {
    saveHabits(habits.map((h) => (h.id === id ? { ...h, count: h.count + 1 } : h)));
  };

  const removeHabit = (id: string) => {
    saveHabits(habits.filter((h) => h.id !== id));
  };

  const columns: { status: TaskStatus; label: string }[] = [
    { status: 'todo', label: 'کارها' },
    { status: 'doing', label: 'در حال انجام' },
    { status: 'done', label: 'انجام‌شده' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><GripVertical className="h-4 w-4" /> تسک‌بورد</CardTitle>
          <CardDescription>تسک‌ها را در سه ستون مدیریت کنید (فقط ذخیره محلی).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="عنوان تسک" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="max-w-[240px]" />
            <Button size="sm" onClick={addTask}><Plus className="h-3.5 w-3.5 me-1" /> افزودن</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {columns.map((col) => (
              <div key={col.status} className="rounded-lg border bg-muted/30 p-3 min-h-[120px]">
                <p className="text-xs font-medium text-muted-foreground mb-2">{col.label}</p>
                {tasks.filter((t) => t.status === col.status).length === 0 ? (
                  <p className="text-xs text-muted-foreground">خالی</p>
                ) : (
                  <ul className="space-y-1.5">
                    {tasks.filter((t) => t.status === col.status).map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-1 text-sm group">
                        <span className="truncate">{t.title}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {col.status !== 'todo' && <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setTaskStatus(t.id, 'todo')}>←</Button>}
                          {col.status !== 'doing' && <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setTaskStatus(t.id, 'doing')}>●</Button>}
                          {col.status !== 'done' && <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setTaskStatus(t.id, 'done')}>✓</Button>}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTask(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> پیگیری عادت</CardTitle>
          <CardDescription>عادت‌های روزانه را ثبت و تعداد را ببینید.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="نام عادت" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} className="max-w-[240px]" />
            <Button size="sm" onClick={addHabit}><Plus className="h-3.5 w-3.5 me-1" /> افزودن</Button>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">هنوز عادتی اضافه نشده.</p>
          ) : (
            <ul className="space-y-2">
              {habits.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">{h.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{h.count}</span>
                    <Button variant="outline" size="sm" onClick={() => incrementHabit(h.id)}>+۱</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeHabit(h.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">چینش برنامه</CardTitle>
          <CardDescription>زمان آزاد را وارد کنید؛ در تب چت بپرسید یا از دکمه «برنامه امروز منو بچین» استفاده کنید.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">زمان آزاد امروز (دقیقه)</Label>
            <Input type="number" min={0} placeholder="مثلاً 120" value={freeTimeMinutes} onChange={(e) => setFreeTimeMinutes(e.target.value)} className="mt-1 max-w-[160px]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
