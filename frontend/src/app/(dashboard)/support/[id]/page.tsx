'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Send, Loader2, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function SupportTicketPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['support-ticket', id],
    queryFn: () => api.getTicket(id),
    enabled: !!id,
  });

  const handleReply = async () => {
    if (!reply.trim()) {
      toast.error('متن پیام را وارد کنید');
      return;
    }
    if (ticket?.status === 'CLOSED') {
      toast.error('این تیکت بسته است');
      return;
    }
    setSending(true);
    try {
      await api.addTicketMessage(id, reply.trim());
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['support-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('پیام ارسال شد');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (error || (!isLoading && !ticket)) {
    return (
      <div className="space-y-6">
        <Link href="/support" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4 ms-1" /> بازگشت به لیست تیکت‌ها
        </Link>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            تیکت یافت نشد یا دسترسی ندارید.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !ticket) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/support" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4 ms-1" /> پشتیبانی
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={ticket.status === 'CLOSED' ? 'secondary' : 'default'}>
                {statusLabel[ticket.status] ?? ticket.status}
              </Badge>
              <Badge variant="outline">{categoryLabel[ticket.category] ?? ticket.category}</Badge>
              <span className="text-sm text-muted-foreground">{formatDate(ticket.createdAt)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {ticket.messages?.map((msg: any) => (
              <div
                key={msg.id}
                className={`rounded-xl p-4 ${
                  msg.isStaff
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium">
                    {msg.isStaff ? 'پشتیبانی' : msg.author?.name || 'شما'}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>

          {ticket.status !== 'CLOSED' && (
            <div className="border-t pt-4 space-y-2">
              <textarea
                placeholder="پاسخ خود را بنویسید..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={handleReply} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="ms-2">ارسال پاسخ</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
