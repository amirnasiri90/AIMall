import { Module } from '@nestjs/common';
import { PersianPdfController } from './persian-pdf.controller';
import { PersianPdfService } from './persian-pdf.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [ApiKeysModule],
  controllers: [PersianPdfController],
  providers: [PersianPdfService],
  exports: [PersianPdfService],
})
export class PersianPdfModule {}
