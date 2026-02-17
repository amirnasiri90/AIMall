'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListTodo, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

const statusLabels: Record<string, string> = {
  PENDING: 'در انتظار',
  PROCESSING: 'در حال پردازش',
  COMPLETED: 'تکمیل شده',
  FAILED: 'ناموفق',
};

const statusIcons: Record<string, typeof Clock> = {
  PENDING: Clock,
  PROCESSING: Loader2,
  COMPLETED: CheckCircle,
  FAILED: XCircle,
};

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, limit, statusFilter || undefined],
    queryFn: () => api.listJobs(page, limit, statusFilter || undefined),
  });

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">کارهای صف</h1>
          <p className="text-muted-foreground mt-1">وضعیت کارهای ناهمگام (تصویر، صدا، ورک‌فلو)</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setStatusFilter(''); setPage(1); }}
        >
          همه
        </Button>
        {Object.entries(statusLabels).map(([value, label]) => (
          <Button
            key={value}
            variant={statusFilter === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatusFilter(value); setPage(1); }}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">لیست کارها</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !jobs.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">کار در صفی وجود ندارد</p>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {jobs.map((job: any) => {
                  const Icon = statusIcons[job.status] ?? Clock;
                  return (
                    <li
                      key={job.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {job.status === 'PROCESSING' ? (
                          <Icon className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <span className="font-mono text-sm">{job.id.slice(0, 8)}…</span>
                          <span className="text-muted-foreground ms-2">• {job.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {statusLabels[job.status] ?? job.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {job.createdAt ? new Date(job.createdAt).toLocaleString('fa-IR') : ''}
                        </span>
                        {job.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            تا {new Date(job.completedAt).toLocaleString('fa-IR')}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    قبلی
                  </Button>
                  <span className="flex items-center px-2 text-sm text-muted-foreground">
                    {page} / {totalPages} (جمع: {total})
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    بعدی
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
