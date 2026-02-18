'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { normalizePhone, toPersianDigits } from '@/lib/phone';
import { useAuthStore } from '@/lib/store';
import { useLogoUrl } from '@/lib/use-branding';

export default function LoginPage() {
  const logoUrl = useLogoUrl();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState<number | null>(null);
  const [otpTotalSeconds, setOtpTotalSeconds] = useState<number>(120);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const clearFieldError = (key: string) => {
    setFieldError((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  useEffect(() => {
    if (!otpExpiresAt || !otpSent) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((otpExpiresAt.getTime() - Date.now()) / 1000));
      setOtpSecondsLeft(left);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [otpExpiresAt, otpSent]);

  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const usePhone = mode === 'password' && phone.trim();
    if (usePhone) {
      const normalized = normalizePhone(phone.trim());
      if (normalized.length !== 11 || !normalized.startsWith('09')) {
        setFieldError((p) => ({ ...p, loginPhone: 'شماره موبایل معتبر وارد کنید (مثال: 09123456789)' }));
        toast.error('شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
        return;
      }
      if (!password) {
        setFieldError((p) => ({ ...p, loginPassword: 'رمز عبور را وارد کنید' }));
        toast.error('رمز عبور را وارد کنید');
        return;
      }
      setFieldError({});
      setLoading(true);
      try {
        const data = await api.login({ phone: normalized, password });
        setAuth(data.user, data.access_token);
        toast.success('ورود موفقیت‌آمیز');
        router.push('/dashboard');
      } catch (err: any) {
        toast.error(err.message || 'خطا در ورود');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!email.trim() || !password) {
      setFieldError({
        loginPhone: !email.trim() ? 'ایمیل را وارد کنید' : '',
        loginPassword: !password ? 'رمز عبور را وارد کنید' : '',
      });
      toast.error('ایمیل و رمز عبور را وارد کنید');
      return;
    }
    setFieldError({});
    setLoading(true);
    try {
      const data = await api.login({ email: email.trim(), password });
      setAuth(data.user, data.access_token);
      toast.success('ورود موفقیت‌آمیز');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone.trim());
    if (normalized.length !== 11 || !normalized.startsWith('09')) {
      setFieldError((p) => ({ ...p, loginPhone: 'شماره موبایل معتبر وارد کنید (مثال: 09123456789)' }));
      toast.error('شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
      return;
    }
    setFieldError((p) => ({ ...p, loginPhone: '' }));
    setOtpLoading(true);
    try {
      const res = await api.sendOtp(normalized);
      setOtpSent(true);
      const sec = res.expiresInSeconds ?? 120;
      setOtpTotalSeconds(sec);
      if (res.expiresAt) {
        setOtpExpiresAt(new Date(res.expiresAt));
        setOtpSecondsLeft(Math.max(0, Math.ceil((new Date(res.expiresAt).getTime() - Date.now()) / 1000)));
      } else {
        setOtpExpiresAt(new Date(Date.now() + sec * 1000));
        setOtpSecondsLeft(sec);
      }
      toast.success('کد به شماره شما ارسال شد');
    } catch (err: any) {
      toast.error(err.message || 'ارسال کد ناموفق');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const normalized = normalizePhone(phone.trim());
    if (normalized.length !== 11 || !normalized.startsWith('09')) {
      toast.error('شماره موبایل معتبر وارد کنید');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.sendOtp(normalized);
      const sec = res.expiresInSeconds ?? 120;
      setOtpTotalSeconds(sec);
      if (res.expiresAt) {
        setOtpExpiresAt(new Date(res.expiresAt));
        setOtpSecondsLeft(Math.max(0, Math.ceil((new Date(res.expiresAt).getTime() - Date.now()) / 1000)));
      } else {
        setOtpExpiresAt(new Date(Date.now() + sec * 1000));
        setOtpSecondsLeft(sec);
      }
      setOtpCode('');
      toast.success('کد جدید ارسال شد');
    } catch (err: any) {
      toast.error(err.message || 'ارسال کد ناموفق');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone.trim());
    if (!otpCode.trim() || otpCode.trim().length < 5) {
      setFieldError((p) => ({ ...p, loginOtp: 'کد دریافتی را وارد کنید' }));
      toast.error('کد دریافتی را وارد کنید');
      return;
    }
    setFieldError({});
    setLoading(true);
    try {
      const data = await api.loginWithOtp(normalized, otpCode.trim());
      setAuth(data.user, data.access_token);
      toast.success('ورود موفقیت‌آمیز');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="text-center p-4 sm:p-6">
        <div className="flex justify-center mb-2">
          <div className="relative h-10 w-20 sm:h-12 sm:w-24">
            <Image src={logoUrl} alt="AiFO" fill className="object-contain" sizes="96px" priority unoptimized={logoUrl.startsWith('http') || logoUrl.startsWith('data:')} />
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl">ورود به AiFO</CardTitle>
        <CardDescription className="text-xs sm:text-sm">همه‌فن‌حریف اینجاست — با رمز عبور یا کد یکبارمصرف دقیق و سریع وارد شو</CardDescription>
      </CardHeader>
      <Tabs value={mode} onValueChange={(v) => { setMode(v as 'password' | 'otp'); setOtpSent(false); setOtpCode(''); setOtpExpiresAt(null); setOtpSecondsLeft(null); setFieldError({}); }}>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <TabsList className="grid w-full grid-cols-2 h-auto p-0.5 min-h-[44px]">
            <TabsTrigger value="password" className="text-xs sm:text-sm py-3 px-2 min-h-[44px]">ورود با رمز</TabsTrigger>
            <TabsTrigger value="otp" className="text-xs sm:text-sm py-3 px-2 min-h-[44px]">ورود با کد OTP</TabsTrigger>
          </TabsList>

          {mode === 'password' && (
            <form onSubmit={handleLoginPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-phone">شماره موبایل یا ایمیل</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="login-phone"
                    dir="ltr"
                    className="text-left min-h-[48px]"
                    placeholder="09123456789 یا you@example.com"
                    value={phone || email}
                    onChange={(e) => {
                      clearFieldError('loginPhone');
                      const v = e.target.value;
                      if (/^[\d۰-۹\s\-]+$/.test(v) || v.startsWith('09') || v === '') {
                        setPhone(v);
                        setEmail('');
                      } else {
                        setEmail(v);
                        setPhone('');
                      }
                    }}
                    required
                    aria-invalid={!!fieldError.loginPhone}
                    aria-describedby={fieldError.loginPhone ? 'login-phone-error' : undefined}
                  />
                </div>
                {fieldError.loginPhone && (
                  <p id="login-phone-error" role="alert" className="text-sm text-destructive">
                    {fieldError.loginPhone}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => { clearFieldError('loginPassword'); setPassword(e.target.value); }}
                  required
                  dir="ltr"
                  className="text-left min-h-[48px]"
                  aria-invalid={!!fieldError.loginPassword}
                  aria-describedby={fieldError.loginPassword ? 'login-password-error' : undefined}
                />
                {fieldError.loginPassword && (
                  <p id="login-password-error" role="alert" className="text-sm text-destructive">
                    {fieldError.loginPassword}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full min-h-[48px] text-base" disabled={loading} aria-busy={loading}>
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                ورود
              </Button>
            </form>
          )}

          {mode === 'otp' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="login-otp-phone">شماره موبایل</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="login-otp-phone"
                    dir="ltr"
                    className="text-left flex-1 min-w-0 min-h-[48px]"
                    placeholder="09123456789"
                    value={phone}
                    onChange={(e) => { clearFieldError('loginPhone'); setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); }}
                    disabled={otpSent}
                    aria-invalid={!!fieldError.loginPhone}
                    aria-describedby={fieldError.loginPhone ? 'login-otp-phone-error' : undefined}
                  />
                  {!otpSent ? (
                    <Button type="button" variant="outline" onClick={handleSendOtp} disabled={otpLoading} className="shrink-0 min-h-[48px]">
                      {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'دریافت کد'}
                    </Button>
                  ) : null}
                </div>
                {fieldError.loginPhone && (
                  <p id="login-otp-phone-error" role="alert" className="text-sm text-destructive">
                    {fieldError.loginPhone}
                  </p>
                )}
              </div>
              {otpSent && (
                <form onSubmit={handleLoginOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-otp-code">کد ارسال‌شده</Label>
                    <Input
                      id="login-otp-code"
                      dir="ltr"
                      className="text-left text-lg tracking-widest min-h-[48px]"
                      placeholder="۱۲۳۴۵"
                      value={otpCode}
                      onChange={(e) => { clearFieldError('loginOtp'); setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
                      maxLength={6}
                      aria-invalid={!!fieldError.loginOtp}
                      aria-describedby={fieldError.loginOtp ? 'login-otp-code-error' : undefined}
                    />
                    {fieldError.loginOtp && (
                      <p id="login-otp-code-error" role="alert" className="text-sm text-destructive">
                        {fieldError.loginOtp}
                      </p>
                    )}
                  </div>
                  {otpSecondsLeft !== null && (
                    <div className="space-y-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-linear"
                          style={{
                            width: `${otpTotalSeconds > 0 ? (otpSecondsLeft / otpTotalSeconds) * 100 : 0}%`,
                            background: 'linear-gradient(90deg, hsl(168 42% 68%) 0%, hsl(192 50% 62%) 50%, hsl(25 55% 65%) 100%)',
                          }}
                        />
                      </div>
                      <div dir="rtl" className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 ${otpSecondsLeft > 0 ? 'bg-primary/8 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                        {otpSecondsLeft > 0 ? (
                          <>
                            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold tabular-nums">
                              {toPersianDigits(otpSecondsLeft)}
                            </span>
                            <span className="text-sm font-medium">ثانیه تا انقضای کد</span>
                          </>
                        ) : (
                          <span className="text-sm font-medium">کد منقضی شده — درخواست کد جدید دهید</span>
                        )}
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="w-full min-h-[48px] text-base" disabled={loading || (otpSecondsLeft !== null && otpSecondsLeft <= 0)} aria-busy={loading}>
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    ورود با کد
                  </Button>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="outline" className="flex-1 min-h-[48px]" onClick={handleResendOtp} disabled={otpLoading}>
                      {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ارسال مجدد کد'}
                    </Button>
                    <Button type="button" variant="ghost" className="flex-1 min-h-[48px]" onClick={() => { setOtpSent(false); setOtpCode(''); setOtpExpiresAt(null); setOtpSecondsLeft(null); }} disabled={otpLoading}>
                      تغییر شماره
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-4 p-4 sm:p-6 pt-0">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            کنجکاوی؟{' '}
            <Link href="/register" className="text-primary hover:underline">همین الان ثبت‌نام کن</Link>
          </p>
        </CardFooter>
      </Tabs>
    </Card>
  );
}
