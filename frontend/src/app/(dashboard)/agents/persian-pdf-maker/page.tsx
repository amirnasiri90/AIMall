'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  FileUp,
  Loader2,
  Download,
  RefreshCw,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const MAX_TEXT_LENGTH = 200_000;
const MAX_DOCX_SIZE_MB = 10;
const HISTORY_KEY = 'persian-pdf-maker-history';
const MAX_HISTORY = 10;

type TabMode = 'text' | 'docx';

interface HistoryItem {
  fileId: string;
  title: string;
  mode: TabMode;
  at: string;
}

function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(item: HistoryItem) {
  const list = loadHistory();
  const next = [item, ...list.filter((i) => i.fileId !== item.fileId)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export default function PersianPdfMakerPage() {
  const [mode, setMode] = useState<TabMode>('text');
  const [text, setText] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [font, setFont] = useState('Vazirmatn');
  const [fontSize, setFontSize] = useState(14);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [digits, setDigits] = useState<'fa' | 'en'>('fa');
  const [pageNumbers, setPageNumbers] = useState(true);
  const [jalaliDate, setJalaliDate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ fileId: string; downloadUrl: string; pdfBase64?: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshHistory = () => setHistory(loadHistory());
  const getDownloadUrl = (fileId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return `${api.persianPdfDownloadUrl(fileId)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  };

  const options = {
    font,
    fontSize,
    lineHeight,
    digits,
    headerFooter: {
      pageNumbers,
      jalaliDate,
      docTitle: documentTitle.trim() || undefined,
    },
  };

  const handleTextToPdf = async () => {
    const t = text.trim();
    if (!t) {
      toast.error('متن خالی است. لطفاً متن وارد کنید.');
      return;
    }
    if (t.length > MAX_TEXT_LENGTH) {
      toast.error(`متن بیشتر از ${(MAX_TEXT_LENGTH / 1000).toLocaleString('fa-IR')} هزار کاراکتر مجاز نیست.`);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.persianPdfTextToPdf({
        text: t,
        title: documentTitle.trim() || undefined,
        options,
      });
      setResult(res);
      saveHistory({ fileId: res.fileId, title: documentTitle.trim() || 'متن → PDF', mode: 'text', at: new Date().toISOString() });
      refreshHistory();
      toast.success('PDF آماده است.');
    } catch (err: any) {
      toast.error(err?.message || 'تبدیل ناموفق بود. دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocxToPdf = async () => {
    if (!docFile) {
      toast.error('فایلی انتخاب نشده است. فقط DOCX پشتیبانی می‌شود.');
      return;
    }
    if (docFile.size > MAX_DOCX_SIZE_MB * 1024 * 1024) {
      toast.error(`حجم فایل بیشتر از حد مجاز است (حداکثر ${MAX_DOCX_SIZE_MB} مگابایت).`);
      return;
    }
    const name = docFile.name.toLowerCase();
    if (!name.endsWith('.docx')) {
      toast.error('فایل نامعتبر است. فقط DOCX پشتیبانی می‌شود.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          if (!base64) throw new Error('خواندن فایل ناموفق بود.');
          const res = await api.persianPdfDocxToPdf({
            fileBase64: base64,
            fileName: docFile.name,
            options,
          });
          setResult(res);
          saveHistory({ fileId: res.fileId, title: docFile.name, mode: 'docx', at: new Date().toISOString() });
          refreshHistory();
          toast.success('PDF آماده است.');
        } catch (err: any) {
          toast.error(err?.message || 'تبدیل ناموفق بود. دوباره تلاش کنید.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(docFile);
    } catch {
      toast.error('تبدیل ناموفق بود. دوباره تلاش کنید.');
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    if (result.pdfBase64) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${result.pdfBase64}`;
      const baseName = documentTitle.trim() ? documentTitle.trim().replace(/[^\w\u0600-\u06FF\s.-]/g, '_').slice(0, 80) : 'persian-pdf';
      link.download = `${baseName}-${result.fileId.slice(0, 8)}.pdf`;
      link.click();
    } else {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const url = `${api.persianPdfDownloadUrl(result.fileId)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(url, '_blank');
    }
  };

  const handleNewConversion = () => {
    setResult(null);
    if (mode === 'text') setText('');
    else setDocFile(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            تبدیل به PDF (فارسی)
            <Badge variant="secondary" className="text-xs">V1</Badge>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            متن یا فایل Word فارسی را با کیفیت استاندارد به PDF تبدیل کن.
          </p>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(v) => { setMode(v as TabMode); setResult(null); }}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            متن → PDF
          </TabsTrigger>
          <TabsTrigger value="docx" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            DOCX → PDF
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-3 mt-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {mode === 'text' ? 'متن فارسی' : 'فایل DOCX'}
                </CardTitle>
                <CardDescription>
                  {mode === 'text'
                    ? 'برای خروجی بهتر، عنوان سند را در بخش تنظیمات وارد کن.'
                    : 'فقط فایل‌های DOCX تا ۱۰ مگابایت.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === 'text' ? (
                  <textarea
                    placeholder="متن فارسی‌ات را اینجا بچسبان…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex min-h-[200px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    maxLength={MAX_TEXT_LENGTH + 1}
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx"
                      className="hidden"
                      onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp className="h-4 w-4 me-2" />
                      {docFile ? docFile.name : 'انتخاب فایل DOCX'}
                    </Button>
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={loading || (mode === 'text' ? !text.trim() : !docFile)}
                  onClick={mode === 'text' ? handleTextToPdf : handleDocxToPdf}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                      در حال ساخت PDF…
                    </>
                  ) : (
                    'ساخت PDF'
                  )}
                </Button>
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardContent className="pt-6 flex flex-wrap gap-3">
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 me-2" />
                    دانلود
                  </Button>
                  <Button variant="outline" onClick={handleNewConversion}>
                    <RefreshCw className="h-4 w-4 me-2" />
                    تبدیل جدید
                  </Button>
                  {result.pdfBase64 && (
                    <div className="w-full mt-4 rounded-lg border bg-muted/30 overflow-hidden">
                      <iframe
                        title="پیش‌نمایش PDF"
                        src={`data:application/pdf;base64,${result.pdfBase64}`}
                        className="w-full h-[480px]"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  تنظیمات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>فونت</Label>
                  <Select value={font} onValueChange={setFont}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vazirmatn">Vazirmatn</SelectItem>
                      <SelectItem value="IRANSans">IRANSans</SelectItem>
                      <SelectItem value="Default">پیش‌فرض سیستم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>اندازه فونت (۱۲ تا ۱۸)</Label>
                  <Select value={String(fontSize)} onValueChange={(v) => setFontSize(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[12, 13, 14, 15, 16, 17, 18].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>فاصله خطوط</Label>
                  <Select value={String(lineHeight)} onValueChange={(v) => setLineHeight(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.4">۱.۴</SelectItem>
                      <SelectItem value="1.6">۱.۶</SelectItem>
                      <SelectItem value="1.8">۱.۸</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>اعداد</Label>
                  <Select value={digits} onValueChange={(v: 'fa' | 'en') => setDigits(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fa">فارسی</SelectItem>
                      <SelectItem value="en">لاتین</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>عنوان سند (اختیاری)</Label>
                  <Input
                    placeholder="عنوان برای هدر PDF و تاریخچه"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>شماره صفحه</Label>
                  <Button
                    type="button"
                    variant={pageNumbers ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPageNumbers(!pageNumbers)}
                  >
                    {pageNumbers ? 'روشن' : 'خاموش'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Label>تاریخ شمسی</Label>
                  <Button
                    type="button"
                    variant={jalaliDate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setJalaliDate(!jalaliDate)}
                  >
                    {jalaliDate ? 'روشن' : 'خاموش'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {history.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">۱۰ مورد اخیر</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {history.slice(0, 10).map((item) => (
                      <li key={item.fileId} className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[140px]" title={item.title}>{item.title}</span>
                        <a
                          href={getDownloadUrl(item.fileId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-0.5"
                        >
                          دانلود
                          <ChevronRight className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
