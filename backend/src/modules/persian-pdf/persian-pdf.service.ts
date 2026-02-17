import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as mammoth from 'mammoth';
import { normalizePersianText, convertDigits, reverseForRtlDisplay } from './persian-pdf.utils';
import { buildPersianPdfHtml, generatePdfFromHtml } from './persian-pdf-html';
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const MAX_TEXT_LENGTH = 200_000;
const MAX_DOCX_BYTES = 10 * 1024 * 1024; // 10MB
const MARGIN = 50;
const FONT_SIZE_DEFAULT = 14;
const LINE_HEIGHT_DEFAULT = 1.6;
const VAZIRMATN_TTF_URL = 'https://cdn.jsdelivr.net/npm/vazirmatn@33.0.0/fonts/ttf/Vazirmatn-Regular.ttf';

interface TextToPdfOptions {
  font?: string;
  fontSize?: number;
  lineHeight?: number;
  digits?: 'fa' | 'en';
  headerFooter?: {
    pageNumbers?: boolean;
    jalaliDate?: boolean;
    docTitle?: string;
  };
}

interface StoredFile {
  buffer: Buffer;
  createdAt: Date;
}

let fontCache: ArrayBuffer | null = null;

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const arr = new Uint8Array(buf.length);
  arr.set(buf);
  return arr.buffer;
}

function getVazirmatnFontLocal(): ArrayBuffer | null {
  const basePaths: string[] = [];
  try {
    const pkgPath = require.resolve('vazirmatn/package.json', { paths: [__dirname, process.cwd()] });
    basePaths.push(dirname(pkgPath));
  } catch {
    // ignore
  }
  basePaths.push(
    join(process.cwd(), 'node_modules', 'vazirmatn'),
    join(__dirname, '..', '..', '..', 'node_modules', 'vazirmatn'),
  );
  const fontPaths: string[] = [];
  for (const base of basePaths) {
    fontPaths.push(join(base, 'fonts', 'ttf', 'Vazirmatn-Regular.ttf'));
    fontPaths.push(join(base, 'misc', 'Non-Latin', 'fonts', 'ttf', 'Vazirmatn-NL-Regular.ttf'));
  }
  for (const fontPath of fontPaths) {
    try {
      if (existsSync(fontPath)) {
        const buf = readFileSync(fontPath);
        if (buf.length > 50000) return bufferToArrayBuffer(buf);
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function getVazirmatnFont(): Promise<ArrayBuffer | null> {
  if (fontCache) return fontCache;
  fontCache = getVazirmatnFontLocal();
  if (fontCache) return fontCache;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(VAZIRMATN_TTF_URL);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        if (ab.byteLength > 50000) {
          fontCache = bufferToArrayBuffer(Buffer.from(ab));
          return fontCache;
        }
      }
    } catch {
      // retry once
    }
  }
  return null;
}

function hasPersianOrArabic(str: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}

@Injectable()
export class PersianPdfService {
  private readonly store = new Map<string, StoredFile>();

  private generateId(): string {
    return createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('hex').slice(0, 24);
  }

  private getJalaliDate(): string {
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

  async textToPdf(text: string, title?: string, options?: TextToPdfOptions): Promise<{ fileId: string; buffer: Buffer; pdfBase64: string }> {
    const raw = typeof text === 'string' ? text : '';
    if (!raw.trim()) throw new BadRequestException('متن خالی است. لطفاً متن وارد کنید.');
    if (raw.length > MAX_TEXT_LENGTH) throw new BadRequestException(`متن بیشتر از ${(MAX_TEXT_LENGTH / 1000).toLocaleString('fa-IR')} هزار کاراکتر مجاز نیست.`);

    const normalized = normalizePersianText(raw);
    const digits = options?.digits ?? 'fa';
    const content = convertDigits(normalized, digits);
    const fontSize = Math.min(18, Math.max(12, options?.fontSize ?? FONT_SIZE_DEFAULT));
    const lineHeight = [1.4, 1.6, 1.8].includes(options?.lineHeight ?? 0) ? options!.lineHeight! : LINE_HEIGHT_DEFAULT;
    const headerFooter = options?.headerFooter ?? {};
    const needPersianFont = hasPersianOrArabic(content);

    if (needPersianFont) {
      try {
        const docTitle = (title || headerFooter.docTitle || '').trim() || 'سند';
        const html = buildPersianPdfHtml(content, {
          docTitle,
          fontSize,
          lineHeight,
          pageNumbers: headerFooter.pageNumbers,
          jalaliDate: headerFooter.jalaliDate ? this.getJalaliDate() : undefined,
        });
        const buffer = await generatePdfFromHtml(html);
        const fileId = this.generateId();
        this.store.set(fileId, { buffer, createdAt: new Date() });
        return { fileId, buffer, pdfBase64: buffer.toString('base64') };
      } catch {
        // fallback to pdf-lib below
      }
    }

    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fontBuf = await getVazirmatnFont();
    if (needPersianFont && !fontBuf) {
      throw new BadRequestException('بارگذاری فونت فارسی ممکن نشد. لطفاً دوباره تلاش کنید.');
    }
    let font;
    if (fontBuf) {
      try {
        font = await doc.embedFont(fontBuf);
      } catch {
        if (needPersianFont) throw new BadRequestException('فونت فارسی در سند قابل استفاده نشد. لطفاً دوباره تلاش کنید.');
        font = await doc.embedFont(StandardFonts.Helvetica);
      }
    } else {
      font = await doc.embedFont(StandardFonts.Helvetica);
    }

    const docTitle = (title || headerFooter.docTitle || '').trim() || 'سند';
    doc.setTitle(docTitle);

    const pageWidth = 595;
    const pageHeight = 842;
    const lineHeightPt = fontSize * lineHeight;
    const maxWidth = pageWidth - 2 * MARGIN;
    const footerH = 24;
    const headerH = 28;

    let currentPage = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - MARGIN - headerH;
    let pageNum = 1;
    const totalPagesStart = 1;

    const spaceWidth = font.widthOfTextAtSize(' ', fontSize);

    const drawLine = (line: string) => {
      if (y < MARGIN + footerH) {
        currentPage = doc.addPage([pageWidth, pageHeight]);
        pageNum++;
        y = pageHeight - MARGIN - headerH;
      }
      if (needPersianFont) {
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          y -= lineHeightPt;
          return;
        }
        const ordered = [...words].reverse();
        const widths = ordered.map((w) => font.widthOfTextAtSize(w, fontSize));
        const totalW = widths.reduce((a, b) => a + b, 0) + (ordered.length > 1 ? spaceWidth * (ordered.length - 1) : 0);
        let x = pageWidth - MARGIN - totalW;
        for (let i = 0; i < ordered.length; i++) {
          currentPage.drawText(ordered[i], {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          x += widths[i] + (i < ordered.length - 1 ? spaceWidth : 0);
        }
      } else {
        const tw = font.widthOfTextAtSize(line, fontSize);
        currentPage.drawText(line, {
          x: pageWidth - MARGIN - tw,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
      y -= lineHeightPt;
    };

    const lines = content.split(/\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        y -= lineHeightPt * 0.5;
        if (y < MARGIN + footerH) {
          currentPage = doc.addPage([pageWidth, pageHeight]);
          pageNum++;
          y = pageHeight - MARGIN - headerH;
        }
        continue;
      }
      const words = trimmed.split(/\s+/).filter(Boolean);
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (textWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) drawLine(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) drawLine(currentLine);
    }

    const pages = doc.getPages();
    const totalPages = pages.length;
    const headerFooterFontSize = Math.min(10, fontSize - 2);
    const headerY = pageHeight - 18;
    const footerY = 16;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNumOneBased = i + 1;

      if (docTitle) {
        const titleToDraw = needPersianFont ? reverseForRtlDisplay(docTitle) : docTitle;
        const titleW = font.widthOfTextAtSize(titleToDraw, headerFooterFontSize);
        page.drawText(titleToDraw, {
          x: pageWidth - MARGIN - titleW,
          y: headerY,
          size: headerFooterFontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      if (headerFooter.pageNumbers) {
        const pageStr = needPersianFont
          ? `صفحه ${convertDigits(String(pageNumOneBased), digits)} از ${convertDigits(String(totalPages), digits)}`
          : `Page ${pageNumOneBased} of ${totalPages}`;
        const pageStrDraw = needPersianFont ? reverseForRtlDisplay(pageStr) : pageStr;
        const pageStrW = font.widthOfTextAtSize(pageStrDraw, headerFooterFontSize);
        page.drawText(pageStrDraw, {
          x: pageWidth - MARGIN - pageStrW,
          y: footerY,
          size: headerFooterFontSize,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
      if (headerFooter.jalaliDate) {
        const jDateRaw = this.getJalaliDate();
        const jDate = needPersianFont ? convertDigits(jDateRaw, digits) : jDateRaw;
        const dateStr = needPersianFont ? reverseForRtlDisplay(jDate) : jDate;
        page.drawText(dateStr, {
          x: MARGIN,
          y: footerY,
          size: headerFooterFontSize,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }

    const pdfBytes = await doc.save();
    const buffer = Buffer.from(pdfBytes);
    const fileId = this.generateId();
    this.store.set(fileId, { buffer, createdAt: new Date() });
    const pdfBase64 = buffer.toString('base64');
    return { fileId, buffer, pdfBase64 };
  }

  async docxToPdf(fileBase64: string, fileName: string, options?: TextToPdfOptions): Promise<{ fileId: string; buffer: Buffer; pdfBase64: string }> {
    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length > MAX_DOCX_BYTES) throw new BadRequestException(`حجم فایل بیشتر از حد مجاز است (حداکثر ${MAX_DOCX_BYTES / 1024 / 1024} مگابایت).`);
    if (!fileName.toLowerCase().endsWith('.docx')) throw new BadRequestException('فایل نامعتبر است. فقط DOCX پشتیبانی می‌شود.');

    const { value: html } = await mammoth.convertToHtml({ buffer });
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) throw new BadRequestException('فایل DOCX خالی است یا متن قابل استخراج نبود.');
    return this.textToPdf(text, fileName.replace(/\.docx$/i, ''), options);
  }

  getFile(fileId: string): Buffer | null {
    const entry = this.store.get(fileId);
    return entry ? entry.buffer : null;
  }
}
