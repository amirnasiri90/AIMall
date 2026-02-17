'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { BookOpen, Plus, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';

export default function KnowledgePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: bases, isLoading } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => api.listKnowledgeBases(),
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('نام پایگاه دانش را وارد کنید');
      return;
    }
    setCreating(true);
    try {
      await api.createKnowledgeBase(name.trim());
      toast.success('پایگاه دانش ایجاد شد');
      setCreateOpen(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (kbId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('حذف این پایگاه و تمام اسناد آن؟')) return;
    try {
      await api.deleteKnowledgeBase(kbId);
      toast.success('پایگاه دانش حذف شد');
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">پایگاه دانش</h1>
          <p className="text-muted-foreground mt-1">RAG و جستجو در اسناد</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 me-2" /> پایگاه جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : !bases?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">هنوز پایگاه دانشی نساخته‌اید</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 me-2" /> ایجاد پایگاه دانش
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bases.map((base: any) => (
            <Link key={base.id} href={`/knowledge/${base.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{base.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">اسناد و جستجو</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => handleDelete(base.id, e)}
                    >
                      حذف
                    </Button>
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
            <DialogTitle>پایگاه دانش جدید</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="نام پایگاه"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
    </div>
  );
}
