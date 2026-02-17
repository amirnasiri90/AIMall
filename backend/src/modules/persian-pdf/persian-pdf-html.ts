import { existsSync } from 'fs';
import { escapeHtml } from './persian-pdf.utils';

const VAZIRMATN_CSS = 'https://cdn.jsdelivr.net/npm/vazirmatn@33.0.0/Vazirmatn-font-face.css';

export interface HtmlPdfOptions {
  docTitle?: string;
  fontSize?: number;
  lineHeight?: number;
  pageNumbers?: boolean;
  jalaliDate?: string;
}

function getJalaliDate(): string {
  const now = new Date();
  const g = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const gy = g - 1600;
  const gm = m - 1;
  const gd = d - 1;
  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
  g_day_no += Math.floor((367 * gm - 362) / 12) + (gm <= 2 ? 0 : (Math.floor((g % 4 === 0 && (g % 100 !== 0 || g % 400 === 0)) ? 1 : 0) - 2)) + gd;
  let j_day_no = g_day_no - 79;
  const j_np = Math.floor(j_day_no / 12053);
  j_day_no %= 12053;
  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;
  jy += Math.floor(j_day_no / 365);
  j_day_no %= 365;
  const jm = Math.floor(j_day_no / 31) + 1;
  const jd = (j_day_no % 31) + 1;
  const jmStr = jm < 10 ? '0' + jm : String(jm);
  const jdStr = jd < 10 ? '0' + jd : String(jd);
  return `${jy}/${jmStr}/${jdStr}`;
}

export function buildPersianPdfHtml(content: string, options: HtmlPdfOptions): string {
  const title = (options.docTitle || 'سند').trim();
  const fontSize = Math.min(18, Math.max(12, options.fontSize ?? 14));
  const lineHeight = options.lineHeight ?? 1.6;
  const jalali = options.jalaliDate ?? getJalaliDate();
  const showPageNumbers = options.pageNumbers ?? true;
  const escaped = escapeHtml(content);
  const bodyStyle = `
    font-family: 'Vazirmatn', Tahoma, sans-serif;
    font-size: ${fontSize}px;
    line-height: ${lineHeight};
    margin: 0;
    padding: 2cm 2cm 2.2cm 2cm;
    direction: rtl;
    text-align: right;
  `;
  const headerFooterStyle = `
    font-family: 'Vazirmatn', Tahoma, sans-serif;
    font-size: 10px;
    color: #555;
    padding: 0 2cm;
  `;
  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <link href="${VAZIRMATN_CSS}" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { ${bodyStyle} }
    .content { white-space: pre-wrap; word-wrap: break-word; }
    @media print {
      .header { position: fixed; top: 0; left: 0; right: 0; ${headerFooterStyle} padding-top: 0.5cm; border-bottom: 1px solid #eee; }
      .footer { position: fixed; bottom: 0; left: 0; right: 0; ${headerFooterStyle} padding-bottom: 0.5cm; border-top: 1px solid #eee; }
      body { padding-top: 1.2cm; padding-bottom: 1.2cm; }
    }
  </style>
</head>
<body>
  ${title ? `<div class="header">${escapeHtml(title)}</div>` : ''}
  ${showPageNumbers || jalali ? `<div class="footer">${jalali}</div>` : ''}
  <div class="content">${escaped}</div>
</body>
</html>`;
}

function findChromePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.platform !== 'win32') return undefined;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer');
  const executablePath = findChromePath();
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    ...(executablePath && { executablePath }),
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });
    await page.evaluateHandle('document.fonts.ready');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
