/**
 * Extract text from PDF buffer for chat/agent context.
 * Uses pdf-parse (PDFParse.getText); result is truncated to avoid overflowing model context.
 */
const MAX_PDF_TEXT_LENGTH = 25_000;

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const mod = await import('pdf-parse');
  const PDFParse = (mod as any).PDFParse ?? (mod as any).default?.PDFParse ?? (mod as any).default;
  if (!PDFParse) throw new Error('PDFParse not found');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = (result?.text ?? '').trim();
    if (!text) return '';
    if (text.length <= MAX_PDF_TEXT_LENGTH) return text;
    return text.slice(0, MAX_PDF_TEXT_LENGTH) + '\n\n[... متن بریده شده به دلیل طول ...]';
  } finally {
    if (typeof parser.destroy === 'function') await parser.destroy();
  }
}

export async function extractTextFromPdfBase64(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');
  return extractTextFromPdfBuffer(buffer);
}
