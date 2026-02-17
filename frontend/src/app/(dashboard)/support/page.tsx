'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { LifeBuoy, Plus, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const statusLabel: Record<string, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال بررسی',
  CLOSED: 'بسته',
};

const categoryLabel: Record<string, string> = {
  CONSULTING_SALES: 'مشاوره و فروش',
  TECHNICAL: 'فنی',
};

export default function SupportPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('CONSULTING_SALES');
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter === 'all' ? undefined : statusFilter],
    queryFn: () => api.getMyTickets(statusFilter === 'all' ? undefined : statusFilter),
  });

  const handleCreate = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('موضوع و متن پیام را وارد کنید');
      return;
    }
    setCreating(true);
    try {
      const ticket = await api.createTicket(subject.trim(), body.trim(), category as 'CONSULTING_SALES' | 'TECHNICAL');
      toast.success('تیکت ثبت شد');
      setCreateOpen(false);
      setSubject('');
      setBody('');
      setCategory('CONSULTING_SALES');
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      window.location.href = `/support/${ticket.id}`;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">پشتیبانی</h1>
          <p className="text-muted-foreground mt-1">تیکت‌های پشتیبانی و گفتگو با تیم ما</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 me-2" /> تیکت جدید
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">همه</TabsTrigger>
          <TabsTrigger value="OPEN">باز</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">در حال بررسی</TabsTrigger>
          <TabsTrigger value="CLOSED">بسته</TabsTrigger>
        </TabsList>
        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !tickets?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <LifeBuoy className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">تیکتی ثبت نشده است</p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 me-2" /> ایجاد تیکت
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tickets.map((t: any) => (
                <Link key={t.id} href={`/support/${t.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{t.subject}</span>
                          <Badge variant={t.status === 'CLOSED' ? 'secondary' : 'default'}>
                            {statusLabel[t.status] ?? t.status}
                          </Badge>
                          <Badge variant="outline">{categoryLabel[t.category] ?? t.category}</Badge>
                        </div>
                        {t.messages?.[0] && (
                          <p className="text-sm text-muted-foreground truncate mt-1">{t.messages[0].content}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(t.updatedAt)}</p>
                      </div>
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby="create-ticket-desc">
          <DialogHeader>
            <DialogTitle>تیکت جدید</DialogTitle>
            <DialogDescription id="create-ticket-desc">
              موضوع و متن اولیه را وارد کنید. پشتیبانی به‌زودی پاسخ می‌دهد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>دسته‌بندی</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSULTING_SALES">مشاوره و فروش</SelectItem>
                  <SelectItem value="TECHNICAL">فنی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">موضوع</Label>
              <Input
                id="subject"
                placeholder="مثال: مشکل در پرداخت"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="body">متن پیام</Label>
              <textarea
                id="body"
                placeholder="شرح مشکل یا درخواست..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ms-2">ثبت تیکت</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
