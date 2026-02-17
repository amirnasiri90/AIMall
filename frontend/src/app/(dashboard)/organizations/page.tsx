'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, Users, Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function OrganizationsPage() {
  const { user } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const hasOrgPlan = user?.hasOrganizationPlan;
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: api.listOrganizations,
    enabled: !!hasOrgPlan,
  });

  const handleCreate = async () => {
    if (!orgName.trim()) { toast.error('نام سازمان را وارد کنید'); return; }
    setCreating(true);
    try {
      await api.createOrganization(orgName.trim());
      toast.success('سازمان ایجاد شد');
      setCreateOpen(false);
      setOrgName('');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!hasOrgPlan) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">سازمان‌ها</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">برای استفاده از بخش سازمان‌ها باید پلن سازمانی خریداری کنید.</p>
            <p className="text-sm text-muted-foreground mb-6">با پلن سازمانی می‌توانید تیم بسازید، اعضا دعوت کنید و مصرف آن‌ها را مشاهده کنید.</p>
            <Button asChild>
              <Link href="/billing">
                <CreditCard className="h-4 w-4 me-2" /> خرید پلن سازمانی
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">سازمان‌ها</h1>
          <p className="text-muted-foreground mt-1">مدیریت تیم و دسترسی سازمانی</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 me-2" /> سازمان جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !orgs?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">هنوز سازمانی نساخته‌اید</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 me-2" /> ایجاد سازمان
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orgs.map((org: any) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{org.name}</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{org.slug}</span>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>نقش شما: {org.role === 'OWNER' ? 'مالک' : org.role === 'ADMIN' ? 'مدیر' : 'عضو'}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>سازمان جدید</DialogTitle>
            <DialogDescription>نام سازمان را وارد کنید. شما به عنوان مالک اضافه می‌شوید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Input
              placeholder="نام سازمان"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={creating || !orgName.trim()}>
              {creating && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              ایجاد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
