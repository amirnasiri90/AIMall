'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Plus, Loader2, FileText, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';

export default function KnowledgeBaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [addOpen, setAddOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const queryClient = useQueryClient();

  const { data: bases } = useQuery({ queryKey: ['knowledge-bases'], queryFn: () => api.listKnowledgeBases() });
  const base = bases?.find((b: any) => b.id === id);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['knowledge-documents', id],
    queryFn: () => api.getDocuments(id),
    enabled: !!id,
  });

  const handleAddDocument = async () => {
    if (!docName.trim() || !docContent.trim()) {
      toast.error('نام و محتوای سند را وارد کنید');
      return;
    }
    setAdding(true);
    try {
      await api.addDocument(id, docName.trim(), docContent.trim());
      toast.success('سند اضافه شد');
      setAddOpen(false);
      setDocName('');
      setDocContent('');
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents', id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchKnowledge(id, searchQ.trim(), 5);
      setSearchResult(res);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteDoc = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('حذف این سند؟')) return;
    try {
      await api.deleteDocument(id, docId);
      toast.success('سند حذف شد');
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents', id] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!id) return null;
  if (base === undefined && bases?.length) {
    return (
      <div className="space-y-6">
        <Link href="/knowledge" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4 ms-1" /> بازگشت به پایگاه‌ها
        </Link>
        <p>پایگاه یافت نشد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/knowledge" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4 ms-1" /> پایگاه‌ها
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{base?.name ?? 'پایگاه دانش'}</h1>
          <p className="text-muted-foreground mt-1">اسناد و جستجو</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 me-2" /> افزودن سند
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">جستجو در پایگاه</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="عبارت جستجو..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <Search className="h-4 w-4 me-2" /> جستجو
          </Button>
        </CardContent>
        {searchResult && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-2">نتایج:</p>
            <pre className="text-sm bg-muted/50 p-3 rounded-lg overflow-auto max-h-48">
              {JSON.stringify(searchResult, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اسناد</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !documents?.length ? (
            <p className="text-muted-foreground py-4">هنوز سندی نداری — کنجکاو باش و با «افزودن سند» شروع کن.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc: any) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{doc.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن سند</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="نام سند"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <textarea
            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="محتوای سند (متن)"
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>انصراف</Button>
            <Button onClick={handleAddDocument} disabled={adding}>
              {adding && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              افزودن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
