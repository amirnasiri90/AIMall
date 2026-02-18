import { Controller, Get, Param, Res, Req, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const SITE_DIR = join(process.cwd(), 'uploads', 'site');
const ALLOWED_FILES_LIST = [
  'favicon.ico',
  'favicon.png',
  'apple-touch-icon.png',
  'pwa-192.png',
  'pwa-512.png',
  'logo.png',
];

/** کنترلر عمومی برندینگ — بدون احراز هویت؛ برای سرو لوگوها و برگرداندن آدرس آن‌ها */
@ApiTags('branding')
@Controller()
export class BrandingController {
  private baseUrl(req: Request): string {
    const env = process.env.BACKEND_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (env) return env.replace(/\/$/, '');
    const protocol = (req as any).protocol || 'http';
    const host = req.get('host') || '';
    return `${protocol}://${host}`;
  }

  private fileUrlWithVersion(base: string, filename: string): string | null {
    const path = join(SITE_DIR, filename);
    if (!existsSync(path)) return null;
    try {
      const mtime = statSync(path).mtimeMs;
      return `${base}/${filename}?v=${Math.round(mtime)}`;
    } catch {
      return `${base}/${filename}`;
    }
  }

  @Get('branding')
  getBranding(@Req() req: Request) {
    const base = `${this.baseUrl(req)}/api/v1/uploads/site`;
    const result: Record<string, string | null> = {
      favicon: null,
      appleTouchIcon: null,
      pwa192: null,
      pwa512: null,
      logo: null,
    };
    result.favicon = this.fileUrlWithVersion(base, 'favicon.ico') ?? this.fileUrlWithVersion(base, 'favicon.png');
    result.appleTouchIcon = this.fileUrlWithVersion(base, 'apple-touch-icon.png');
    result.pwa192 = this.fileUrlWithVersion(base, 'pwa-192.png');
    result.pwa512 = this.fileUrlWithVersion(base, 'pwa-512.png');
    result.logo = this.fileUrlWithVersion(base, 'logo.png');
    return result;
  }

  @Get('uploads/site/:filename')
  serveSiteFile(@Param('filename') filename: string, @Res() res: Response) {
    if (!ALLOWED_FILES_LIST.includes(filename)) {
      throw new BadRequestException('نام فایل مجاز نیست');
    }
    const path = join(SITE_DIR, filename);
    if (!existsSync(path)) {
      return res.status(404).json({ message: 'فایل یافت نشد' });
    }
    res.setHeader('Cache-Control', 'public, max-age=86400'); // یک روز؛ با ?v= بعد از آپلود جدید عوض می‌شود
    return res.sendFile(path);
  }
}
