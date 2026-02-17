# دستیار تبدیل به PDF (فارسی) — Persian PDF Maker

تبدیل متن فارسی و فایل DOCX به PDF با کیفیت RTL و فونت استاندارد.

## نحوه اجرا

- بک‌اند را اجرا کنید (`npm run start:dev`). ماژول به‌صورت خودکار بارگذاری می‌شود.
- از فرانت‌اند به مسیر **دستیارها → تبدیل به PDF (فارسی)** بروید و از تب «متن → PDF» یا «DOCX → PDF» استفاده کنید.

## محدودیت‌ها (V1)

- **متن**: حداکثر ۲۰۰٬۰۰۰ کاراکتر.
- **DOCX**: حداکثر ۱۰ مگابایت؛ فقط فرمت `.docx` پشتیبانی می‌شود.
- فایل‌های تولیدشده در حافظه سرور نگهداری می‌شوند (پیشنهاد: پاک‌سازی پس از ۷ روز با cron یا مشابه).

## API

Base URL: `http://localhost:3001/api/v1` (یا آدرس واقعی سرور).

همه endpointها به **احراز هویت** (Bearer JWT یا API Key) نیاز دارند.

### ۱) متن → PDF

```bash
curl -X POST "http://localhost:3001/api/v1/assistants/persian-pdf/text-to-pdf" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "text": "متن فارسی شما.",
    "title": "عنوان سند",
    "options": {
      "font": "Vazirmatn",
      "fontSize": 14,
      "lineHeight": 1.6,
      "digits": "fa",
      "headerFooter": {
        "pageNumbers": true,
        "jalaliDate": true,
        "docTitle": "عنوان"
      }
    }
  }'
```

پاسخ نمونه:

```json
{
  "fileId": "abc123...",
  "downloadUrl": "http://localhost:3001/api/v1/assistants/persian-pdf/files/abc123...",
  "pdfBase64": "..."
}
```

### ۲) DOCX → PDF

```bash
# فایل را به base64 تبدیل کنید، سپس:
curl -X POST "http://localhost:3001/api/v1/assistants/persian-pdf/docx-to-pdf" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "fileBase64": "UEsDBBQABgAI...",
    "fileName": "document.docx",
    "options": { "fontSize": 14, "digits": "fa" }
  }'
```

### ۳) دانلود فایل

```bash
curl -o output.pdf "http://localhost:3001/api/v1/assistants/persian-pdf/files/FILE_ID"
```

نیازی به توکن برای دانلود نیست؛ `FILE_ID` غیرقابل حدس است.

## وابستگی‌ها

- `pdf-lib`: ساخت PDF
- `@pdf-lib/fontkit`: تعبیه فونت (Vazirmatn از CDN)
- `mammoth`: استخراج متن از DOCX

## تست

```bash
cd backend
npm install --save-dev jest ts-jest @types/jest
npm test -- --testPathPattern=persian-pdf
```

تست‌های واحد برای `normalizePersianText`، `convertDigits` و `escapeHtml` در `persian-pdf.utils.spec.ts` هستند.

## امنیت

- متن ورودی قبل از استفاده در HTML/PDF باید escape شود (در سرویس از نرمال‌سازی و خروجی pdf-lib استفاده می‌شود).
- محدودیت حجم و طول متن اعمال شده است.
