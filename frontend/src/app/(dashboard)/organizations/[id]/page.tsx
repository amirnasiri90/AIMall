'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  ArrowRight,
  Loader2,
  UserPlus,
  MoreHorizontal,
  LogOut,
  Shield,
  Crown,
  User,
  Calendar,
  Coins,
  BarChart3,
  Save,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/utils';

const roleLabels: Record<string, string> = {
  OWNER: 'مالک',
  ADMIN: 'مدیر',
  MEMBER: 'عضو',
};

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [roleChangeMemberId, setRoleChangeMemberId] = useState<string | null>(null);
  const [roleChangeValue, setRoleChangeValue] = useState('');
  const [memberLimitInput, setMemberLimitInput] = useState<string>('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [usageFrom, setUsageFrom] = useState('');
  const [usageTo, setUsageTo] = useState('');
  const [limitsMember, setLimitsMember] = useState<{ id: string; user?: { email?: string; name?: string }; role: string; limitChats?: number | null; limitImageGen?: number | null; limitTextGen?: number | null; canUseAgents?: boolean } | null>(null);
  const [limitsForm, setLimitsForm] = useState({ limitChats: '', limitImageGen: '', limitTextGen: '', canUseAgents: true });
  const [savingLimits, setSavingLimits] = useState(false);

  const { data: org, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => api.getOrganization(id),
    enabled: !!id,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['organization-members', id],
    queryFn: () => api.getOrganizationMembers(id),
    enabled: !!id && !!org,
  });

  const canManageMembers = org?.role === 'OWNER' || org?.role === 'ADMIN';

  useEffect(() => {
    if (!org) return;
    setMemberLimitInput(org.memberLimit != null ? String(org.memberLimit) : '');
  }, [org?.id, org?.memberLimit]);

  const { data: usageStats, isLoading: usageLoading } = useQuery({
    queryKey: ['organization-usage', id, usageFrom, usageTo],
    queryFn: () => api.getOrganizationUsage(id, { from: usageFrom || undefined, to: usageTo || undefined }),
    enabled: !!id && !!org && canManageMembers,
  });
  const { data: memberUsageCounts } = useQuery({
    queryKey: ['member-usage-counts', id, limitsMember?.id],
    queryFn: () => api.getMemberUsageCounts(id, limitsMember!.id),
    enabled: !!id && !!limitsMember?.id && canManageMembers,
  });
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['organization-invitations', id],
    queryFn: () => api.getOrganizationInvitations(id),
    enabled: !!id && !!org && canManageMembers,
  });
  const isOwner = org?.role === 'OWNER';

  const openLimitsDialog = (m: any) => {
    setLimitsMember(m);
    setLimitsForm({
      limitChats: m.limitChats != null ? String(m.limitChats) : '',
      limitImageGen: m.limitImageGen != null ? String(m.limitImageGen) : '',
      limitTextGen: m.limitTextGen != null ? String(m.limitTextGen) : '',
      canUseAgents: m.canUseAgents !== false,
    });
  };

  const handleSaveMemberLimits = async () => {
    if (!limitsMember) return;
    setSavingLimits(true);
    try {
      const body = {
        limitChats: limitsForm.limitChats.trim() === '' ? null : parseInt(limitsForm.limitChats, 10),
        limitImageGen: limitsForm.limitImageGen.trim() === '' ? null : parseInt(limitsForm.limitImageGen, 10),
        limitTextGen: limitsForm.limitTextGen.trim() === '' ? null : parseInt(limitsForm.limitTextGen, 10),
        canUseAgents: limitsForm.canUseAgents,
      };
      if ((body.limitChats != null && isNaN(body.limitChats)) || (body.limitImageGen != null && isNaN(body.limitImageGen)) || (body.limitTextGen != null && isNaN(body.limitTextGen))) {
        toast.error('مقادیر عددی نامعتبر');
        setSavingLimits(false);
        return;
      }
      await api.updateMemberLimits(id, limitsMember.id, body);
      toast.success('محدودیت‌ها ذخیره شد');
      setLimitsMember(null);
      queryClient.invalidateQueries({ queryKey: ['organization-members', id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingLimits(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('ایمیل را وارد کنید');
      return;
    }
    setInviting(true);
    try {
      await api.inviteMember(id, inviteEmail.trim(), inviteRole);
      toast.success('دعوتنامه ارسال شد. پیامک و ایمیل به کاربر ارسال شده و دعوت در داشبورد او نمایش داده می‌شود. پس از پذیرش به اعضا اضافه می‌شود.');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
      queryClient.invalidateQueries({ queryKey: ['organization-members', id] });
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      await api.updateMemberRole(id, memberId, newRole);
      toast.success('نقش به‌روز شد');
      setRoleChangeMemberId(null);
      queryClient.invalidateQueries({ queryKey: ['organization-members', id] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.removeMember(id, memberId);
      toast.success('عضو حذف شد');
      queryClient.invalidateQueries({ queryKey: ['organization-members', id] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveMemberLimit = async () => {
    const val = memberLimitInput.trim();
    const num = val === '' ? null : parseInt(val, 10);
    if (val !== '' && (num === null || !Number.isFinite(num) || num < 0)) {
      toast.error('حد اعضا باید عدد نامنفی یا خالی (نامحدود) باشد');
      return;
    }
    setSavingLimit(true);
    try {
      await api.updateOrganization(id, { memberLimit: num ?? undefined });
      toast.success('حد اعضا ذخیره شد');
      queryClient.invalidateQueries({ queryKey: ['organization', id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingLimit(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await api.leaveOrganization(id);
      toast.success('سازمان را ترک کردید');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      router.push('/organizations');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLeaving(false);
      setLeaveConfirmOpen(false);
    }
  };

  if (orgError) {
    return (
      <div className="space-y-6">
        <Link href="/organizations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> بازگشت به سازمان‌ها
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">دسترسی به این سازمان ندارید یا سازمان یافت نشد.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/organizations">لیست سازمان‌ها</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orgLoading || !org) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/organizations">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{org.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{org.slug}</p>
        </div>
        <Badge variant="secondary">{roleLabels[org.role] || org.role}</Badge>
        {!isOwner && (
          <Button variant="outline" size="sm" onClick={() => setLeaveConfirmOpen(true)}>
            <LogOut className="h-4 w-4 me-1" /> ترک سازمان
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(org.contractEndsAt != null || org.customCoinQuota != null) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-4 w-4" /> قرارداد و سقف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {org.customCoinQuota != null && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">سقف سکه:</span>
                  <span>{org.customCoinQuota.toLocaleString('fa-IR')}</span>
                </div>
              )}
              {org.contractEndsAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">پایان قرارداد:</span>
                  <span>{formatDate(org.contractEndsAt)}</span>
                </div>
              )}
              {org.plan && org.plan !== 'FREE' && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">پلن:</span>
                  <Badge variant="outline">{org.plan}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canManageMembers && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> حد اعضا
              </CardTitle>
              <CardDescription>خالی = نامحدود. بعد از ذخیره، دعوت بیش از حد مجاز امکان‌پذیر نیست.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={0}
                placeholder="نامحدود"
                className="w-28"
                value={memberLimitInput}
                onChange={(e) => setMemberLimitInput(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">
                {members?.length != null && (
                  <>اکنون: {members.length} نفر{org.memberLimit != null ? ` از ${org.memberLimit}` : ''}</>
                )}
              </span>
              <Button size="sm" onClick={handleSaveMemberLimit} disabled={savingLimit}>
                {savingLimit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="me-1">ذخیره</span>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> اعضا
              {members && <span className="text-muted-foreground font-normal">({members.length})</span>}
            </CardTitle>
            {canManageMembers && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 me-1" /> دعوت
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !members?.length ? (
              <p className="text-sm text-muted-foreground">هنوز عضوی اضافه نشده. با دعوت، پیامک و ایمیل به کاربر ارسال شده و دعوت در داشبورد او نمایش داده می‌شود.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[hsl(var(--glass-border-subtle))]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--glass-border-subtle))] bg-muted/50">
                      <th className="p-3 text-right font-medium">عضو</th>
                      <th className="p-3 text-right font-medium">نقش</th>
                      {canManageMembers && (
                        <>
                          <th className="p-3 text-right font-medium">حد چت</th>
                          <th className="p-3 text-right font-medium">حد تصویر</th>
                          <th className="p-3 text-right font-medium">حد متن</th>
                          <th className="p-3 text-right font-medium">دستیارها</th>
                          <th className="p-3 text-right font-medium w-24">عملیات</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m: any) => (
                      <tr key={m.id} className="border-b border-[hsl(var(--glass-border-subtle))] last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{m.user?.name || m.user?.email || '—'}</p>
                              <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'} className="shrink-0">
                            {m.role === 'OWNER' && <Crown className="h-3 w-3 me-1" />}
                            {m.role === 'ADMIN' && <Shield className="h-3 w-3 me-1" />}
                            {roleLabels[m.role] || m.role}
                          </Badge>
                        </td>
                        {canManageMembers && (
                          <>
                            <td className="p-3 text-muted-foreground">{m.limitChats != null ? formatNumber(m.limitChats) : '—'}</td>
                            <td className="p-3 text-muted-foreground">{m.limitImageGen != null ? formatNumber(m.limitImageGen) : '—'}</td>
                            <td className="p-3 text-muted-foreground">{m.limitTextGen != null ? formatNumber(m.limitTextGen) : '—'}</td>
                            <td className="p-3">{m.canUseAgents === false ? <span className="text-destructive text-xs">خیر</span> : <span className="text-muted-foreground text-xs">بله</span>}</td>
                            <td className="p-3">
                              {m.role !== 'OWNER' && (
                                <div className="flex items-center gap-1">
                                  {roleChangeMemberId === m.id ? (
                                    <>
                                      <Select value={roleChangeValue} onValueChange={setRoleChangeValue}>
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {isOwner && <SelectItem value="ADMIN">مدیر</SelectItem>}
                                          <SelectItem value="MEMBER">عضو</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button size="sm" variant="ghost" onClick={() => handleUpdateRole(m.id, roleChangeValue)}>تأیید</Button>
                                      <Button size="sm" variant="ghost" onClick={() => { setRoleChangeMemberId(null); setRoleChangeValue(''); }}>انصراف</Button>
                                    </>
                                  ) : (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1">
                                          <Settings2 className="h-3.5 w-3.5" /> دسترسی
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => openLimitsDialog(m)}>
                                          <Settings2 className="h-3.5 w-3.5 me-2" /> محدودیت‌ها و دسترسی
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setRoleChangeMemberId(m.id); setRoleChangeValue(m.role); }}>
                                          تغییر نقش
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveMember(m.id)}>
                                          حذف از سازمان
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {canManageMembers && pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">دعوت‌های در انتظار تأیید</CardTitle>
              <CardDescription>این کاربران دعوت شده‌اند؛ پس از پذیرش در داشبوردشان به اعضا اضافه می‌شوند.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pendingInvitations.map((inv: any) => (
                  <li key={inv.id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--glass-border-subtle))] last:border-0">
                    <div>
                      <p className="text-sm font-medium">{inv.user?.name || inv.user?.email || inv.email}</p>
                      <p className="text-xs text-muted-foreground">{inv.user?.email ?? inv.email} • نقش: {inv.role === 'ADMIN' ? 'مدیر' : 'عضو'} • {formatDate(inv.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {canManageMembers && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> آمار مصرف اعضا
            </CardTitle>
            <CardDescription>مجموع سکه مصرف‌شده و تعداد تراکنش هر عضو در بازه انتخابی (اختیاری)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">از تاریخ</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={usageFrom}
                  onChange={(e) => setUsageFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">تا تاریخ</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={usageTo}
                  onChange={(e) => setUsageTo(e.target.value)}
                />
              </div>
            </div>
            {usageLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !usageStats?.members?.length ? (
              <p className="text-sm text-muted-foreground">آمار مصرفی ثبت نشده یا بازه انتخابی خالی است.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[hsl(var(--glass-border-subtle))]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--glass-border-subtle))] bg-muted/50">
                      <th className="p-3 text-right font-medium">نام / ایمیل</th>
                      <th className="p-3 text-right font-medium">نقش</th>
                      <th className="p-3 text-right font-medium">تعداد تراکنش</th>
                      <th className="p-3 text-right font-medium">مجموع سکه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageStats.members.map((row: any) => (
                      <tr key={row.userId} className="border-b border-[hsl(var(--glass-border-subtle))] last:border-0">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{row.name || '—'}</p>
                            <p className="text-xs text-muted-foreground">{row.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{roleLabels[row.role] || row.role}</Badge>
                        </td>
                        <td className="p-3">{formatNumber(row.transactionCount ?? 0)}</td>
                        <td className="p-3 font-medium">{formatNumber(row.totalCoinsUsed ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!limitsMember} onOpenChange={(open) => !open && setLimitsMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>محدودیت‌های عضو</DialogTitle>
            <DialogDescription>
              {limitsMember?.user?.name || limitsMember?.user?.email || 'عضو'} — خالی = نامحدود
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {memberUsageCounts && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-2">مصرف فعلی:</p>
                <p>چت: {formatNumber((memberUsageCounts as any).chatCount)}{(memberUsageCounts as any).limitChats != null ? ` از ${(memberUsageCounts as any).limitChats}` : ''}</p>
                <p>تصویر: {formatNumber((memberUsageCounts as any).imageCount)}{(memberUsageCounts as any).limitImageGen != null ? ` از ${(memberUsageCounts as any).limitImageGen}` : ''}</p>
                <p>متن: {formatNumber((memberUsageCounts as any).textCount)}{(memberUsageCounts as any).limitTextGen != null ? ` از ${(memberUsageCounts as any).limitTextGen}` : ''}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>حد چت‌ها</Label>
                <Input type="number" min={0} placeholder="نامحدود" value={limitsForm.limitChats} onChange={(e) => setLimitsForm((f) => ({ ...f, limitChats: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>حد تولید تصویر</Label>
                <Input type="number" min={0} placeholder="نامحدود" value={limitsForm.limitImageGen} onChange={(e) => setLimitsForm((f) => ({ ...f, limitImageGen: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>حد تولید متن</Label>
                <Input type="number" min={0} placeholder="نامحدود" value={limitsForm.limitTextGen} onChange={(e) => setLimitsForm((f) => ({ ...f, limitTextGen: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="canUseAgents" checked={limitsForm.canUseAgents} onChange={(e) => setLimitsForm((f) => ({ ...f, canUseAgents: e.target.checked }))} className="rounded" />
              <Label htmlFor="canUseAgents">دسترسی به دستیارها</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitsMember(null)}>انصراف</Button>
            <Button onClick={handleSaveMemberLimits} disabled={savingLimits}>
              {savingLimits ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دعوت عضو</DialogTitle>
            <DialogDescription>
              ایمیل کاربری که قبلاً در AiFO ثبت‌نام کرده را وارد کنید. نقش او را انتخاب کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>نقش</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isOwner && <SelectItem value="ADMIN">مدیر</SelectItem>}
                  <SelectItem value="MEMBER">عضو</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>انصراف</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              ارسال دعوت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ترک سازمان</DialogTitle>
            <DialogDescription>
              با ترک این سازمان دسترسی شما به منابع آن قطع می‌شود. این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveConfirmOpen(false)}>انصراف</Button>
            <Button variant="destructive" onClick={handleLeave} disabled={leaving}>
              {leaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              ترک سازمان
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
