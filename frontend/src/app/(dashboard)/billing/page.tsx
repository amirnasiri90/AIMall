'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Coins, Loader2, CreditCard, Sparkles, RefreshCw, FileCheck,
  ArrowUpCircle, ArrowDownCircle, Receipt, Filter, ChevronDown, Tag, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatDate, formatNumber, formatPrice } from '@/lib/utils';
import { Building2, Calendar, Coins as CoinsIcon } from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const bc = user?.billingContext;
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [payLoading, setPayLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [reconciling, setReconciling] = useState(false);
  const [txFilter, setTxFilter] = useState<{ category?: string; type?: string }>({});
  const [invoiceDialog, setInvoiceDialog] = useState<{ pkg: any } | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: balance, isLoading: balLoading } = useQuery({ queryKey: ['balance'], queryFn: api.getBalance });
  const { data: packages } = useQuery({ queryKey: ['packages'], queryFn: api.getPackages });
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', page, txFilter],
    queryFn: () => api.getTransactions(page, 10, txFilter),
  });
  const { data: ledgerSummary } = useQuery({ queryKey: ['ledger-summary'], queryFn: api.getLedgerSummary });
  const { data: ordersData } = useQuery({
    queryKey: ['payment-orders', orderPage],
    queryFn: () => api.getPaymentOrders(orderPage, 10),
  });

  const handleMockTopup = async () => {
    const amount = parseInt(topupAmount);
    if (!amount || amount <= 0) { toast.error('مقدار نامعتبر'); return; }
    setTopupLoading(true);
    try {
      await api.mockTopup(amount);
      toast.success(`${amount} سکه اضافه شد`);
      setTopupAmount('');
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-summary'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTopupLoading(false);
    }
  };

  const openInvoiceDialog = (pkg: any) => {
    setInvoiceDialog({ pkg });
    setDiscountCode('');
    setPreview(null);
  };

  useEffect(() => {
    if (!invoiceDialog?.pkg?.id) return;
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      try {
        const data = await api.previewPayment(invoiceDialog.pkg.id, undefined);
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [invoiceDialog?.pkg?.id]);

  const loadPreview = async () => {
    if (!invoiceDialog?.pkg?.id) return;
    setPreviewLoading(true);
    try {
      const data = await api.previewPayment(invoiceDialog.pkg.id, discountCode.trim() || undefined);
      setPreview(data);
    } catch (err: any) {
      toast.error(err.message);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePayment = async (packageId: string, withDiscountCode?: string) => {
    setPayLoading(packageId);
    try {
      const data = await api.createPayment(packageId, withDiscountCode?.trim() || undefined);
      if ((data as any).freeOrder) {
        setInvoiceDialog(null);
        setPreview(null);
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['ledger-summary'] });
        queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
        toast.success(`پرداخت رایگان انجام شد. ${(data as any).coins} سکه به حساب شما اضافه شد.`);
        router.push(`/billing/callback?status=success&coins=${(data as any).coins}&refId=${encodeURIComponent((data as any).refId || '')}`);
      } else if ((data as any).paymentUrl) {
        setInvoiceDialog(null);
        setPreview(null);
        window.location.href = (data as any).paymentUrl;
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPayLoading(null);
    }
  };

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const result = await api.reconcile();
      if (result.wasConsistent) {
        toast.success('موجودی صحیح است');
      } else {
        toast.success(`موجودی اصلاح شد: ${result.previousBalance} → ${result.calculatedBalance}`);
      }
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReconciling(false);
    }
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'در انتظار',
    PAID: 'پرداخت شده',
    FAILED: 'ناموفق',
  };
  const statusVariants: Record<string, 'default' | 'destructive' | 'secondary'> = {
    PENDING: 'secondary',
    PAID: 'default',
    FAILED: 'destructive',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">صورتحساب</h1>
        <p className="text-muted-foreground mt-1">مدیریت اعتبار، تراکنش‌ها و پرداخت‌ها</p>
      </div>

      {/* Balance Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20 md:col-span-2">
          <CardContent className="flex items-center gap-6 p-8">
            <div className="rounded-full bg-primary/10 backdrop-blur-sm p-4">
              <Coins className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">موجودی شما</p>
              {balLoading ? <Skeleton className="h-10 w-32" /> : (
                <p className="text-4xl font-bold">{formatNumber(balance?.coins || 0)} <span className="text-lg font-normal">سکه</span></p>
              )}
              {balance && !balance.isConsistent && (
                <p className="text-xs text-destructive mt-1">عدم تطابق موجودی شناسایی شد</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleReconcile} disabled={reconciling}>
              {reconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
              <span className="ms-2 hidden sm:inline">بازبینی</span>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="h-3.5 w-3.5 text-green-500" /> کل واریز</span>
              <span className="font-medium text-green-600">{formatNumber(balance?.totalCredits || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="h-3.5 w-3.5 text-red-500" /> کل برداشت</span>
              <span className="font-medium text-red-500">{formatNumber(balance?.totalDebits || 0)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[hsl(var(--glass-border-subtle))] pt-2">
              <span className="text-sm text-muted-foreground">تراز حسابداری</span>
              <span className="font-bold">{formatNumber(balance?.calculatedBalance || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Org billing context: cap & contract */}
      {bc && (bc.effectiveCoinCap != null || bc.contractEndsAt) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              قرارداد سازمان {bc.organizationName ? `«${bc.organizationName}»` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            {bc.effectiveCoinCap != null && (
              <div className="flex items-center gap-2">
                <CoinsIcon className="h-4 w-4 text-amber-600" />
                <span className="text-muted-foreground">سقف سکه:</span>
                <span className="font-medium">{formatNumber(bc.effectiveCoinCap)}</span>
              </div>
            )}
            {bc.contractEndsAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                <span className="text-muted-foreground">پایان قرارداد:</span>
                <span className="font-medium">{new Date(bc.contractEndsAt).toLocaleDateString('fa-IR')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Packages */}
      {packages && packages.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">خرید سکه</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((pkg: any, idx: number) => (
              <Card key={pkg.id} className={idx === 1 ? 'border-primary/40 ring-1 ring-primary/30 shadow-glass-lg' : ''}>
                {idx === 1 && <div className="bg-primary text-primary-foreground text-center py-1 text-xs font-medium rounded-t-2xl">محبوب‌ترین</div>}
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{pkg.name}</CardTitle>
                    <Badge variant={pkg.packageType === 'ORGANIZATION' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                      {pkg.packageType === 'ORGANIZATION' ? 'پلن سازمانی' : 'پلن عادی'}
                    </Badge>
                  </div>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{formatNumber(pkg.coins)}</p>
                    <p className="text-sm text-muted-foreground">سکه</p>
                  </div>
                  <p className="text-center text-lg font-semibold">
                    {pkg.discountPercent > 0 ? (
                      <span><span className="line-through text-muted-foreground">{formatPrice(pkg.priceIRR)}</span> → {formatPrice(Math.round(pkg.priceIRR * (1 - pkg.discountPercent / 100)))}</span>
                    ) : (
                      formatPrice(pkg.priceIRR)
                    )}
                  </p>
                  <Button className="w-full" variant={idx === 1 ? 'default' : 'outline'} disabled={payLoading === pkg.id} onClick={() => openInvoiceDialog(pkg)}>
                    {payLoading === pkg.id ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <CreditCard className="me-2 h-4 w-4" />}
                    خرید و مشاهده صورت‌حساب
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Transactions / Payment Orders / Mock Topup */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">تراکنش‌ها</TabsTrigger>
          <TabsTrigger value="orders">سفارش‌های پرداخت</TabsTrigger>
          <TabsTrigger value="topup">شارژ آزمایشی</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[hsl(var(--glass-border-subtle))]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={txFilter.type || 'all'} onValueChange={(v) => { setTxFilter(f => ({ ...f, type: v === 'all' ? undefined : v })); setPage(1); }}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="نوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="CREDIT">واریز</SelectItem>
                  <SelectItem value="DEBIT">برداشت</SelectItem>
                </SelectContent>
              </Select>
              <Select value={txFilter.category || 'all'} onValueChange={(v) => { setTxFilter(f => ({ ...f, category: v === 'all' ? undefined : v })); setPage(1); }}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="دسته" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="usage">مصرف</SelectItem>
                  <SelectItem value="payment">پرداخت</SelectItem>
                  <SelectItem value="topup">شارژ</SelectItem>
                  <SelectItem value="admin">مدیریت</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <CardContent className="p-0">
              {txLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : txData?.transactions?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">تراکنشی ثبت نشده</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(var(--glass-border-subtle))] bg-[hsl(var(--glass-bg))]">
                          <th className="p-3 text-right font-medium">نوع</th>
                          <th className="p-3 text-right font-medium">مقدار</th>
                          <th className="p-3 text-right font-medium">مانده</th>
                          <th className="p-3 text-right font-medium">دلیل</th>
                          <th className="p-3 text-right font-medium">سرویس</th>
                          <th className="p-3 text-right font-medium">دسته</th>
                          <th className="p-3 text-right font-medium">تاریخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txData.transactions.map((tx: any) => (
                          <tr key={tx.id} className="border-b border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))] transition-colors">
                            <td className="p-3">
                              <Badge variant={tx.type === 'CREDIT' ? 'default' : 'destructive'}>
                                {tx.type === 'CREDIT' ? 'واریز' : 'برداشت'}
                              </Badge>
                            </td>
                            <td className="p-3 font-medium">
                              <span className={tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}>
                                {tx.type === 'CREDIT' ? '+' : '-'}{formatNumber(tx.amount)}
                              </span>
                            </td>
                            <td className="p-3">{formatNumber(tx.balance)}</td>
                            <td className="p-3">{tx.reason}</td>
                            <td className="p-3">{tx.service || '-'}</td>
                            <td className="p-3"><Badge variant="secondary" className="text-[10px]">{tx.category}</Badge></td>
                            <td className="p-3 text-muted-foreground">{formatDate(tx.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {txData.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>قبلی</Button>
                      <span className="text-sm text-muted-foreground">صفحه {page} از {txData.totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= txData.totalPages} onClick={() => setPage(p => p + 1)}>بعدی</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {!ordersData?.orders?.length ? (
                <p className="text-center text-muted-foreground py-8">سفارش پرداختی ثبت نشده</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(var(--glass-border-subtle))] bg-[hsl(var(--glass-bg))]">
                          <th className="p-3 text-right font-medium">سکه</th>
                          <th className="p-3 text-right font-medium">مبلغ</th>
                          <th className="p-3 text-right font-medium">وضعیت</th>
                          <th className="p-3 text-right font-medium">درگاه</th>
                          <th className="p-3 text-right font-medium">شماره مرجع</th>
                          <th className="p-3 text-right font-medium">تاریخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersData.orders.map((order: any) => (
                          <tr key={order.id} className="border-b border-[hsl(var(--glass-border-subtle))] hover:bg-[hsl(var(--glass-bg))] transition-colors">
                            <td className="p-3 font-medium">{formatNumber(order.coins)}</td>
                            <td className="p-3">{formatPrice(order.priceIRR)}</td>
                            <td className="p-3">
                              <Badge variant={statusVariants[order.status] || 'secondary'}>
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </td>
                            <td className="p-3">{order.gateway}</td>
                            <td className="p-3 text-muted-foreground font-mono text-xs" dir="ltr">{order.refId || '-'}</td>
                            <td className="p-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {ordersData.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4">
                      <Button variant="outline" size="sm" disabled={orderPage <= 1} onClick={() => setOrderPage(p => p - 1)}>قبلی</Button>
                      <span className="text-sm text-muted-foreground">صفحه {orderPage} از {ordersData.totalPages}</span>
                      <Button variant="outline" size="sm" disabled={orderPage >= ordersData.totalPages} onClick={() => setOrderPage(p => p + 1)}>بعدی</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mock Topup Tab */}
        <TabsContent value="topup" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>شارژ آزمایشی</CardTitle>
              <CardDescription>برای تست، مقدار دلخواه سکه اضافه کنید</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Input type="number" placeholder="تعداد سکه" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="max-w-xs" dir="ltr" />
              <Button onClick={handleMockTopup} disabled={topupLoading}>
                {topupLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Sparkles className="me-2 h-4 w-4" />}
                شارژ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!invoiceDialog} onOpenChange={(open) => !open && setInvoiceDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> صورت‌حساب و پرداخت</DialogTitle>
            <DialogDescription>جزئیات فاکتور قبل از پرداخت</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {invoiceDialog?.pkg && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="font-medium text-sm text-muted-foreground">بسته انتخابی</p>
                <p className="font-semibold">{invoiceDialog.pkg.name} — {formatNumber(invoiceDialog.pkg.coins)} سکه</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="discount">کد تخفیف (اختیاری)</Label>
              <div className="flex gap-2">
                <Input
                  id="discount"
                  placeholder="کد را وارد کنید"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={loadPreview} disabled={previewLoading}>
                  {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                  اعمال
                </Button>
              </div>
            </div>
            {previewLoading && !preview && (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            )}
            {preview && (
              <div className="rounded-xl border-2 border-border bg-card p-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground border-b pb-2">جزئیات فاکتور</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">مبلغ پایه (قیمت بسته)</span>
                    <span dir="ltr">{formatPrice(preview.basePriceIRR)}</span>
                  </div>
                  {preview.packageDiscountIRR > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>تخفیف بسته</span>
                      <span dir="ltr">-{formatPrice(preview.packageDiscountIRR)}</span>
                    </div>
                  )}
                  {preview.discountCodeIRR != null && preview.discountCodeIRR > 0 && (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>مبلغ قبل از اعمال کد تخفیف</span>
                        <span dir="ltr">{formatPrice((preview.basePriceIRR ?? 0) - (preview.packageDiscountIRR ?? 0))}</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>مبلغ کم‌شده با کد تخفیف</span>
                        <span dir="ltr">-{formatPrice(preview.discountCodeIRR)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-between font-semibold pt-3 border-t text-base">
                  <span>مبلغ قابل پرداخت</span>
                  <span dir="ltr">{formatPrice(preview.finalPriceIRR)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog(null)}>انصراف</Button>
            <Button
              onClick={() => invoiceDialog?.pkg?.id && handlePayment(invoiceDialog.pkg.id, discountCode.trim() || undefined)}
              disabled={!invoiceDialog?.pkg?.id || payLoading === invoiceDialog?.pkg?.id}
            >
              {payLoading === invoiceDialog?.pkg?.id ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <CreditCard className="me-2 h-4 w-4" />}
              ادامه به درگاه پرداخت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
