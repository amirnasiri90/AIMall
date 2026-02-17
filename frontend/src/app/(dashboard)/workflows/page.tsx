'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GitBranch, Plus, Play, Loader2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';

const defaultDefinition = { steps: [{ id: 'step1', type: 'llm', config: { prompt: 'سلام، خروجی را به فارسی بده.', model: 'openai/gpt-4o-mini', maxTokens: 200 } }] };

export default function WorkflowsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [definition, setDefinition] = useState(JSON.stringify(defaultDefinition, null, 2));
  const [creating, setCreating] = useState(false);
  const [runInput, setRunInput] = useState('{}');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runsOpen, setRunsOpen] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.listWorkflows(),
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('نام ورک‌فلو را وارد کنید');
      return;
    }
    let def: any;
    try {
      def = JSON.parse(definition || '{}');
    } catch {
      toast.error('تعریف ورک‌فلو باید JSON معتبر باشد');
      return;
    }
    setCreating(true);
    try {
      await api.createWorkflow(name.trim(), def);
      toast.success('ورک‌فلو ایجاد شد');
      setCreateOpen(false);
      setName('');
      setDefinition(JSON.stringify(defaultDefinition, null, 2));
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRun = async (workflowId: string, asyncRun: boolean) => {
    let input: Record<string, any>;
    try {
      input = JSON.parse(runInput || '{}');
    } catch {
      toast.error('ورودی باید JSON معتبر باشد');
      return;
    }
    setRunningId(workflowId);
    try {
      const res = await api.runWorkflow(workflowId, input, asyncRun);
      if (res.jobId) {
        toast.success(`در صف اجرا. jobId: ${res.jobId}`);
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      } else {
        toast.success('اجرا شد');
      }
      setRunInput('{}');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ورک‌فلوها</h1>
          <p className="text-muted-foreground mt-1">اتوماسیون چند مرحله‌ای (LLM و ابزار)</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 me-2" /> ورک‌فلو جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !workflows?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">هنوز ورک‌فلو نساخته‌اید</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 me-2" /> ایجاد ورک‌فلو
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workflows.map((wf: any) => (
            <Card key={wf.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{wf.name}</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">{wf._count?.runs ?? 0} اجرا</span>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRun(wf.id, false)}
                    disabled={runningId !== null}
                  >
                    {runningId === wf.id && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    <Play className="h-4 w-4 me-2" /> اجرا (همگام)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRun(wf.id, true)}
                    disabled={runningId !== null}
                  >
                    {runningId === wf.id && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    اجرا (صف)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRunsOpen(runsOpen === wf.id ? null : wf.id)}
                  >
                    <ListChecks className="h-4 w-4" />
                  </Button>
                </div>
                {runsOpen === wf.id && (
                  <WorkflowRuns workflowId={wf.id} onClose={() => setRunsOpen(null)} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ورک‌فلو جدید</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="نام ورک‌فلو"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            placeholder='{ "steps": [ ... ] }'
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              ایجاد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ورودی برای اجرا (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            value={runInput}
            onChange={(e) => setRunInput(e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowRuns({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
  const { data: runs, isLoading } = useQuery({
    queryKey: ['workflow-runs', workflowId],
    queryFn: () => api.getWorkflowRuns(workflowId, 10),
  });
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="font-medium mb-2">آخرین اجراها</p>
      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : !runs?.length ? (
        <p className="text-muted-foreground">اجرایی ثبت نشده</p>
      ) : (
        <ul className="space-y-1">
          {runs.map((r: any) => (
            <li key={r.id} className="flex justify-between">
              <span>{r.status}</span>
              <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString('fa-IR')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
