import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync, writeFileSync, createReadStream } from 'fs';
import { join } from 'path';
import { SupportService } from './support.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const SUPPORT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'support');
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateImageFile(file: Express.Multer.File | undefined): void {
  if (!file) return;
  if (!file.buffer?.length) throw new BadRequestException('فایل تصویر نامعتبر است');
  if (file.buffer.length > MAX_FILE_SIZE) throw new BadRequestException('حداکثر حجم فایل ۵ مگابایت است');
  if (!ALLOWED_MIMES.includes(file.mimetype)) throw new BadRequestException('فقط فرمت‌های PNG و JPG مجاز است');
}

@ApiTags('support')
@UseGuards(ApiKeyAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Get()
  findMyTickets(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.supportService.findMyTickets(user.id, status);
  }

  @Get('attachments/:ticketId/:filename')
  async serveAttachment(
    @Param('ticketId') ticketId: string,
    @Param('filename') filename: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const ticket = await this.supportService.findOneForUser(ticketId, user.id).catch(() => null);
    if (!ticket) throw new ForbiddenException();
    const safeFilename = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '');
    const filePath = join(SUPPORT_UPLOAD_DIR, ticketId, safeFilename);
    if (!existsSync(filePath)) return res.status(404).json({ message: 'فایل یافت نشد' });
    res.setHeader('Content-Type', 'application/octet-stream');
    createReadStream(filePath).pipe(res);
  }

  @Post()
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: MAX_FILE_SIZE } }))
  async create(
    @CurrentUser() user: any,
    @Body('subject') subject: string,
    @Body('body') body: string,
    @Body('category') category?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!subject?.trim() || !body?.trim()) throw new BadRequestException('موضوع و متن پیام الزامی است');
    validateImageFile(file);
    const ticket = await this.supportService.create(user.id, subject.trim(), body.trim(), category);
    if (file?.buffer?.length) {
      const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
      const firstMsgId = (ticket.messages as any[])[0]?.id;
      if (firstMsgId) {
        const dir = join(SUPPORT_UPLOAD_DIR, ticket.id);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const filename = `${firstMsgId}.${ext}`;
        const path = join(dir, filename);
        writeFileSync(path, file.buffer);
        await this.supportService.setMessageAttachment(ticket.id, firstMsgId, `${ticket.id}/${filename}`);
      }
    }
    return this.supportService.findOneForUser(ticket.id, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.supportService.findOneForUser(id, user.id);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string, @CurrentUser() user: any) {
    return this.supportService.reopen(id, user.id);
  }

  @Post(':id/messages')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: MAX_FILE_SIZE } }))
  async addMessage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('content') content: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!content?.trim()) throw new BadRequestException('متن پیام الزامی است');
    validateImageFile(file);
    const msg = await this.supportService.addMessage(id, user.id, content.trim(), false);
    if (file?.buffer?.length) {
      const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
      const dir = join(SUPPORT_UPLOAD_DIR, id);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const filename = `${msg.id}.${ext}`;
      const path = join(dir, filename);
      writeFileSync(path, file.buffer);
      await this.supportService.setMessageAttachment(id, msg.id, `${id}/${filename}`);
    }
    return this.supportService.findOneForUser(id, user.id);
  }
}
