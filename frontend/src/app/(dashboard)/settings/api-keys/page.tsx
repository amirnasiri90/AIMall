'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { Key, Plus, Trash2, Copy, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: keys, isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: api.listApiKeys });

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('نام کلید را وارد کنید'); return; }
    setCreating(true);
    try {
      const res = await api.createApiKey(name.trim());
      setCreatedKey(res.key);
      toast.success('کلید ایجاد شد. آن را کپی کنید؛ دیگر نمایش داده نمی‌شود.');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteApiKey(id);
      toast.success('کلید حذف شد');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('کلید کپی شد');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/settings" className="hover:text-foreground">تنظیمات</Link>
        <ChevronRight className="h-4 w-4" />
        <span>کلیدهای API</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold">کلیدهای API</h1>
        <p className="text-muted-foreground mt-1">همه‌فن‌حریف از راه API — کلیدت را بساز و دقیق و امن وصل شو</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>کلیدهای شما</CardTitle>
            <CardDescription>هر کلید را می‌توانید در هدر X-API-Key یا Authorization: Bearer ارسال کنید</CardDescription>
          </div>
          <Button onClick={() => { setCreateOpen(true); setCreatedKey(null); setName(''); }}>
            <Plus className="h-4 w-4 me-2" /> کلید جدید
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !keys?.length ? (
            <p className="text-center text-muted-foreground py-8">هنوز کلیدی نساخته‌اید</p>
          ) : (
            <div className="space-y-3">
              {keys.map((k: any) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border border-[hsl(var(--glass-border-subtle))] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{k.name}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{k.keyPrefix}...</p>
                      {k.lastUsedAt && (
                        <p className="text-[10px] text-muted-foreground">آخرین استفاده: {formatDate(k.lastUsedAt)}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(k.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreatedKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>کلید API جدید</DialogTitle>
            <DialogDescription>نامی برای این کلید انتخاب کنید. پس از ایجاد، کلید فقط یک بار نمایش داده می‌شود.</DialogDescription>
          </DialogHeader>
          {createdKey ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-amber-600 font-medium">این کلید را ذخیره کنید؛ دیگر نمایش داده نمی‌شود.</p>
              <div className="flex gap-2">
                <Input value={createdKey} readOnly className="font-mono text-xs" dir="ltr" />
                <Button variant="outline" size="icon" onClick={() => copyKey(createdKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                در درخواست‌ها از هدر <code className="bg-muted px-1 rounded">X-API-Key: {createdKey.slice(0, 20)}...</code> یا
                <code className="bg-muted px-1 rounded ms-1">Authorization: Bearer &lt;key&gt;</code> استفاده کنید.
              </p>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setCreatedKey(null); }}>بستن</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-2 py-4">
                <Label>نام کلید</Label>
                <Input
                  placeholder="مثلاً: اپ موبایل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
                <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  ایجاد
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
