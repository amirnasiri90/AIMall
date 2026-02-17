'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen, Key, Code } from 'lucide-react';
import { getApiBaseUrlFull } from '@/lib/api';

function getDocsUrl(): string {
  const base = getApiBaseUrlFull();
  return base.replace(/\/api\/v1\/?$/, '') + '/api/v1/docs';
}

export default function DeveloperPage() {
  const docsUrl = getDocsUrl();
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">مستندات API و توسعه‌دهندگان</h1>
        <p className="text-muted-foreground mt-1">
          دسترسی برنامه‌نویسی به API، مستندات Swagger و SDK برای وب و موبایل
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            مستندات OpenAPI (Swagger)
          </CardTitle>
          <CardDescription>
            همه‌فن‌حریف از راه API — امتحان در مرورگر و توضیح دقیق پارامترها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            در Swagger می‌توانید با دکمه Authorize توکن JWT یا کلید API را وارد کنید و درخواست‌ها را مستقیم تست کنید.
          </p>
          <Button asChild>
            <a href={docsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 me-2" />
              باز کردن Swagger UI
            </a>
          </Button>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {docsUrl}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            احراز هویت در API
          </CardTitle>
          <CardDescription>
            دو روش: توکن JWT (ورود از داشبورد) یا کلید API (برای اپ و اسکریپت)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">JWT (Bearer)</p>
            <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
              Authorization: Bearer &lt;access_token&gt;
            </code>
            <p className="text-muted-foreground mt-1">توکن پس از ورود از endpoint لاگین دریافت می‌شود.</p>
          </div>
          <div>
            <p className="font-medium">API Key</p>
            <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
              Authorization: Bearer &lt;api_key&gt;
            </code>
            <p className="text-muted-foreground mt-1">
              کلید API را از تنظیمات → کلیدهای API ایجاد کنید. می‌توانید scope (مثلاً chat, text, image, audio) محدود کنید.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            SDK رسمی
          </CardTitle>
          <CardDescription>
            پکیج <code className="text-xs">@aimall/sdk</code> برای وب و اپ موبایل (React Native / Flutter)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            با SDK می‌توانید بدون نوشتن دستی درخواست‌های HTTP، از متدهای آماده برای احراز هویت، چت، استودیوهای متن/تصویر/صوت و صورتحساب استفاده کنید.
          </p>
          <pre className="p-3 bg-muted rounded text-xs overflow-x-auto" dir="ltr">
            {`npm install @aimall/sdk

import AimallClient from '@aimall/sdk';
const client = new AimallClient({
  baseUrl: 'https://your-api/api/v1',
  getToken: () => localStorage.getItem('token'),
});
await client.login('user@example.com', 'password');
const balance = await client.getBalance();`}
          </pre>
          <p className="text-muted-foreground">
            برای چت استریم از <code className="text-xs">client.getChatStreamUrl()</code> یا <code className="text-xs">client.streamChat()</code> استفاده کنید.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
