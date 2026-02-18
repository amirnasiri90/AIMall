'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useLogoUrl } from '@/lib/use-branding';

function normalizePhone(v: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  let s = v.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
  const d = s.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('09')) return d;
  if (d.length === 10 && d.startsWith('9')) return '0' + d;
  if (d.length === 12 && d.startsWith('989')) return '0' + d.slice(2);
  return d.length === 11 ? d : v;
}

export default function RegisterPage() {
  const logoUrl = useLogoUrl();
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleRegisterPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone.trim());
    if (normalized.length !== 11 || !normalized.startsWith('09')) {
      toast.error('شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
      return;
    }
    setLoading(true);
    try {
      const data = await api.registerWithPhone({
        phone: normalized,
        name: name.trim() || undefined,
        password: password.trim() || undefined,
      });
      setAuth(data.user, data.access_token);
      toast.success('ثبت‌نام موفقیت‌آمیز');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت‌نام');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('ایمیل را وارد کنید');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('رمز عبور حداقل ۶ کاراکتر');
      return;
    }
    setLoading(true);
    try {
      const data = await api.register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      setAuth(data.user, data.access_token);
      toast.success('ثبت‌نام موفقیت‌آمیز');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت‌نام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="relative h-12 w-24">
            <Image src={logoUrl} alt="AiFO" fill className="object-contain" sizes="96px" priority unoptimized={logoUrl.startsWith('http') || logoUrl.startsWith('data:')} />
          </div>
        </div>
        <CardTitle className="text-2xl">ثبت‌نام در AiFO</CardTitle>
        <CardDescription>زنده و بازیگوش — با شماره یا ایمیل دقیق و سریع شروع کن</CardDescription>
      </CardHeader>
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'phone' | 'email')}>
        <CardContent className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone">ثبت‌نام با شماره</TabsTrigger>
            <TabsTrigger value="email">ثبت‌نام با ایمیل</TabsTrigger>
          </TabsList>

          {mode === 'phone' && (
            <form onSubmit={handleRegisterPhone} className="space-y-4">
              <div className="space-y-2">
                <Label>شماره موبایل</Label>
                <Input
                  dir="ltr"
                  className="text-left"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-phone">نام (اختیاری)</Label>
                <Input id="name-phone" placeholder="نام شما" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-phone">رمز عبور (اختیاری — برای ورود با رمز بعداً)</Label>
                <Input id="pass-phone" type="password" placeholder="حداقل ۶ کاراکتر" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="text-left" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                ثبت‌نام
              </Button>
            </form>
          )}

          {mode === 'email' && (
            <form onSubmit={handleRegisterEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-email">نام (اختیاری)</Label>
                <Input id="name-email" placeholder="نام شما" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-email">رمز عبور</Label>
                <Input id="pass-email" type="password" placeholder="حداقل ۶ کاراکتر" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" className="text-left" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                ثبت‌نام
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            حساب کاربری دارید؟{' '}
            <Link href="/login" className="text-primary hover:underline">قبلاً اومدی؟ وارد شو</Link>
          </p>
        </CardFooter>
      </Tabs>
    </Card>
  );
}
