'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Receipt, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [coins, setCoins] = useState(0);
  const [refId, setRefId] = useState<string | null>(null);

  useEffect(() => {
    const s = searchParams.get('status');
    const c = searchParams.get('coins');
    const ref = searchParams.get('refId');
    if (s === 'success') {
      setStatus('success');
      setCoins(parseInt(c || '0'));
      setRefId(ref || null);
    } else {
      setStatus('failed');
      setRefId(ref || null);
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />}
          {status === 'success' && <CheckCircle className="h-16 w-16 mx-auto text-green-500" />}
          {status === 'failed' && <XCircle className="h-16 w-16 mx-auto text-red-500" />}
          <CardTitle className="mt-4">
            {status === 'loading' && 'در حال بررسی...'}
            {status === 'success' && 'وضعیت پرداخت — موفق'}
            {status === 'failed' && 'وضعیت پرداخت — ناموفق'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'success' && (
            <>
              <p className="text-center text-muted-foreground">{formatNumber(coins)} سکه به حساب شما اضافه شد</p>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> خلاصه فاکتور
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تعداد سکه</span>
                    <span className="font-medium">{formatNumber(coins)}</span>
                  </div>
                  {refId && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> شماره پیگیری</span>
                      <span dir="ltr" className="font-mono text-xs bg-muted px-2 py-1 rounded">{refId}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => router.push('/billing')}>مشاهده صورتحساب و سفارش‌ها</Button>
              </div>
            </>
          )}
          {status === 'failed' && (
            <>
              <p className="text-center text-muted-foreground">{searchParams.get('message') || 'پرداخت انجام نشد یا لغو شده است.'}</p>
              {refId && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> شماره پیگیری</span>
                  <span dir="ltr" className="font-mono text-xs">{refId}</span>
                </div>
              )}
              <div className="flex justify-center">
                <Button onClick={() => router.push('/billing')}>بازگشت به صورتحساب</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 w-64">
          <Skeleton className="h-16 w-16 mx-auto rounded-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
