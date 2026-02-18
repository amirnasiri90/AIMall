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
import { normalizePhone } from '@/lib/phone';
import { useAuthStore } from '@/lib/store';
import { useLogoUrl } from '@/lib/use-branding';

export default function RegisterPage() {
  const logoUrl = useLogoUrl();
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const clearFieldError = (key: string) => {
    setFieldError((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const handleRegisterPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone.trim());
    if (normalized.length !== 11 || !normalized.startsWith('09')) {
      setFieldError((p) => ({ ...p, registerPhone: 'شماره موبایل معتبر وارد کنید (مثال: 09123456789)' }));
      toast.error('شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
      return;
    }
    setFieldError({});
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
    const emailErr = !email.trim() ? 'ایمیل را وارد کنید' : '';
    const passErr = !password || password.length < 6 ? 'رمز عبور حداقل ۶ کاراکتر' : '';
    if (emailErr || passErr) {
      setFieldError((p) => ({ ...p, registerEmail: emailErr, registerPassword: passErr }));
      toast.error(emailErr || passErr);
      return;
    }
    setFieldError({});
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
      <CardHeader className="text-center p-4 sm:p-6">
        <div className="flex justify-center mb-2">
          <div className="relative h-10 w-20 sm:h-12 sm:w-24">
            <Image src={logoUrl} alt="AiFO" fill className="object-contain" sizes="96px" priority unoptimized={logoUrl.startsWith('http') || logoUrl.startsWith('data:')} />
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl">ثبت‌نام در AiFO</CardTitle>
        <CardDescription className="text-xs sm:text-sm">زنده و بازیگوش — با شماره یا ایمیل دقیق و سریع شروع کن</CardDescription>
      </CardHeader>
      <Tabs value={mode} onValueChange={(v) => { setMode(v as 'phone' | 'email'); setFieldError({}); }}>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <TabsList className="grid w-full grid-cols-2 h-auto p-0.5 min-h-[44px]">
            <TabsTrigger value="phone" className="text-xs sm:text-sm py-3 px-2 min-h-[44px]">ثبت‌نام با شماره</TabsTrigger>
            <TabsTrigger value="email" className="text-xs sm:text-sm py-3 px-2 min-h-[44px]">ثبت‌نام با ایمیل</TabsTrigger>
          </TabsList>

          {mode === 'phone' && (
            <form onSubmit={handleRegisterPhone} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-phone">شماره موبایل</Label>
                <Input
                  id="register-phone"
                  dir="ltr"
                  className="text-left min-h-[48px]"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => {
                    clearFieldError('registerPhone');
                    const digits = normalizePhone(e.target.value).replace(/\D/g, '').slice(0, 11);
                    setPhone(digits);
                  }}
                  required
                  aria-invalid={!!fieldError.registerPhone}
                  aria-describedby={fieldError.registerPhone ? 'register-phone-error' : undefined}
                />
                {fieldError.registerPhone && (
                  <p id="register-phone-error" role="alert" className="text-sm text-destructive">
                    {fieldError.registerPhone}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-phone">نام (اختیاری)</Label>
                <Input id="name-phone" placeholder="نام شما" value={name} onChange={(e) => setName(e.target.value)} className="min-h-[48px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-phone">رمز عبور (اختیاری — برای ورود با رمز بعداً)</Label>
                <Input id="pass-phone" type="password" placeholder="حداقل ۶ کاراکتر" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="text-left min-h-[48px]" />
              </div>
              <Button type="submit" className="w-full min-h-[48px] text-base" disabled={loading} aria-busy={loading}>
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                ثبت‌نام
              </Button>
            </form>
          )}

          {mode === 'email' && (
            <form onSubmit={handleRegisterEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-email">ایمیل</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { clearFieldError('registerEmail'); setEmail(e.target.value); }}
                  required
                  dir="ltr"
                  className="text-left min-h-[48px]"
                  aria-invalid={!!fieldError.registerEmail}
                  aria-describedby={fieldError.registerEmail ? 'register-email-error' : undefined}
                />
                {fieldError.registerEmail && (
                  <p id="register-email-error" role="alert" className="text-sm text-destructive">
                    {fieldError.registerEmail}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-email">نام (اختیاری)</Label>
                <Input id="name-email" placeholder="نام شما" value={name} onChange={(e) => setName(e.target.value)} className="min-h-[48px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-email">رمز عبور</Label>
                <Input
                  id="pass-email"
                  type="password"
                  placeholder="حداقل ۶ کاراکتر"
                  value={password}
                  onChange={(e) => { clearFieldError('registerPassword'); setPassword(e.target.value); }}
                  required
                  dir="ltr"
                  className="text-left min-h-[48px]"
                  aria-invalid={!!fieldError.registerPassword}
                  aria-describedby={fieldError.registerPassword ? 'register-password-error' : undefined}
                />
                {fieldError.registerPassword && (
                  <p id="register-password-error" role="alert" className="text-sm text-destructive">
                    {fieldError.registerPassword}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full min-h-[48px] text-base" disabled={loading} aria-busy={loading}>
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                ثبت‌نام
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-4 p-4 sm:p-6 pt-0">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            حساب کاربری دارید؟{' '}
            <Link href="/login" className="text-primary hover:underline">قبلاً اومدی؟ وارد شو</Link>
          </p>
        </CardFooter>
      </Tabs>
    </Card>
  );
}
