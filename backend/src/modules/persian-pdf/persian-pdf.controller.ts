import { Controller, Post, Get, Body, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { PersianPdfService } from './persian-pdf.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';

@ApiTags('tools')
@Controller('assistants/persian-pdf')
export class PersianPdfController {
  constructor(private readonly persianPdfService: PersianPdfService) {}

  @UseGuards(ApiKeyAuthGuard)
  @Post('text-to-pdf')
  async textToPdf(
    @Body('text') text: string,
    @Body('title') title: string | undefined,
    @Body('options') options: any,
  ) {
    const result = await this.persianPdfService.textToPdf(text, title, options);
    const baseUrl = process.env.API_BASE_URL || '';
    const prefix = baseUrl || 'http://localhost:3001/api/v1';
    return {
      fileId: result.fileId,
      downloadUrl: `${prefix}/assistants/persian-pdf/files/${result.fileId}`,
      pdfBase64: result.pdfBase64,
    };
  }

  @UseGuards(ApiKeyAuthGuard)
  @Post('docx-to-pdf')
  async docxToPdf(
    @Body('fileBase64') fileBase64: string,
    @Body('fileName') fileName: string,
    @Body('options') options: any,
  ) {
    const result = await this.persianPdfService.docxToPdf(fileBase64, fileName, options);
    const baseUrl = process.env.API_BASE_URL || '';
    const prefix = baseUrl || 'http://localhost:3001/api/v1';
    return {
      fileId: result.fileId,
      downloadUrl: `${prefix}/assistants/persian-pdf/files/${result.fileId}`,
      pdfBase64: result.pdfBase64,
    };
  }

  @Get('files/:id')
  async getFile(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = this.persianPdfService.getFile(id);
    if (!buffer) {
      res.status(404).json({ message: 'فایل یافت نشد یا منقضی شده است.' });
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="persian-pdf-${id.slice(0, 8)}.pdf"`);
    res.send(buffer);
  }
}
