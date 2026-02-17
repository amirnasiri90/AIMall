import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [ProvidersModule],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
