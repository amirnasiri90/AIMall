'use client';

import { useState, useEffect } from 'react';
import { User, Building2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const PROFILE_CHOSEN_KEY = 'aimall_profile_chosen';

export function ProfileSelectModal() {
  const { user, currentOrganizationId, setCurrentOrganizationId } = useAuthStore();
  const [open, setOpen] = useState(false);
  const { data: orgs, isSuccess } = useQuery({
    queryKey: ['organizations'],
    queryFn: api.listOrganizations,
    enabled: !!user,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    if (!isSuccess || !orgs || orgs.length === 0) return;
    if (sessionStorage.getItem(PROFILE_CHOSEN_KEY) === 'true') return;
    setOpen(true);
  }, [user, isSuccess, orgs]);

  const handleSelect = (orgId: string | null) => {
    setCurrentOrganizationId(orgId);
    sessionStorage.setItem(PROFILE_CHOSEN_KEY, 'true');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>انتخاب پروفایل</DialogTitle>
          <DialogDescription>
            عضو چند سازمانی؟ با کدام پروفایل می‌خواهی کار کنی؟ بعد از ورود این انتخاب می‌آید؛ بعداً از سایدبار هم می‌توانی عوض کنی.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <Button variant="outline" className="justify-start gap-3 h-12 flex-row-reverse" onClick={() => handleSelect(null)}>
            <User className="h-5 w-5 shrink-0" />
            پروفایل شخصی
          </Button>
          {orgs?.map((org: any) => (
            <Button
              key={org.id}
              variant="outline"
              className="justify-start gap-3 h-12 flex-row-reverse"
              onClick={() => handleSelect(org.id)}
            >
              <Building2 className="h-5 w-5 shrink-0" />
              {org.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
