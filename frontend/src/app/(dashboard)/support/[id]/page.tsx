'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Send, Loader2, ImageIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const statusLabel: Record<string, string> = {
  IN_PROGRESS: 'در حال بررسی',
  SUPPORT_REPLIED: 'پاسخ پشتیبانی',
  CUSTOMER_REPLIED: 'پاسخ مشتری',
  CLOSED: 'بسته',
};
const categoryLabel: Record<string, string> = {
  CONSULTING_SALES: 'مشاوره و فروش',
  TECHNICAL: 'فنی',
};

function AttachmentImage({ ticketId, attachmentUrl }: { ticketId: string; attachmentUrl: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    api.getSupportAttachmentBlobUrl(ticketId, attachmentUrl).then((url) => {
      objectUrl = url;
      setSrc(url);
    }).catch(() => setSrc(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ticketId, attachmentUrl]);
  if (!src) return <div className="rounded-lg bg-muted flex items-center justify-center h-24 text-muted-foreground text-xs"><ImageIcon className="h-6 w-6" /></div>;
  return <img src={src} alt="پیوست" className="rounded-lg max-h-48 object-contain border bg-muted" />;
}

export default function SupportTicketPage() {
  const params = useParams();
  const id = params.id as string;
  const [reply, setReply] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);
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
      toast.error('این تیکت بسته است. برای ارسال پیام آن را بازگشایی کنید.');
      return;
    }
    if (attachment && !['image/png', 'image/jpeg', 'image/jpg'].includes(attachment.type)) {
      toast.error('فقط فایل‌های PNG و JPG مجاز است');
      return;
    }
    setSending(true);
    try {
      await api.addTicketMessage(id, reply.trim(), attachment ?? undefined);
      setReply('');
      setAttachment(null);
      queryClient.invalidateQueries({ queryKey: ['support-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('پیام ارسال شد');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleReopen = async () => {
    setReopening(true);
    try {
      await api.reopenTicket(id);
      queryClient.invalidateQueries({ queryKey: ['support-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('تیکت بازگشایی شد');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReopening(false);
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/support" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4 ms-1" /> پشتیبانی
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={ticket.status === 'CLOSED' ? 'secondary' : 'default'}>
                {statusLabel[ticket.status] ?? ticket.status}
              </Badge>
              <Badge variant="outline">{categoryLabel[ticket.category] ?? ticket.category}</Badge>
              <span className="text-sm text-muted-foreground">{formatDate(ticket.createdAt)}</span>
            </div>
          </div>
          {ticket.status === 'CLOSED' && (
            <Button variant="outline" size="sm" onClick={handleReopen} disabled={reopening}>
              {reopening ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span className="ms-2">بازگشایی تیکت</span>
            </Button>
          )}
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
                {msg.attachmentUrl && (
                  <div className="mt-2">
                    <AttachmentImage ticketId={ticket.id} attachmentUrl={msg.attachmentUrl} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {ticket.status !== 'CLOSED' && (
            <div className="border-t pt-4 space-y-3">
              <textarea
                placeholder="پاسخ خود را بنویسید..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div>
                <p className="text-xs text-muted-foreground mb-1">پیوست تصویر (اختیاری): PNG، JPG — حداکثر ۵ مگابایت</p>
                <Input
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  className="max-w-xs"
                  onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                />
                {attachment && <p className="text-xs text-muted-foreground mt-1">{attachment.name}</p>}
              </div>
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
