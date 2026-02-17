import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { WalletService } from './wallet.service';
import { LedgerService } from './ledger.service';
import { UsersModule } from '../users/users.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [UsersModule, ApiKeysModule],
  controllers: [BillingController],
  providers: [BillingService, WalletService, LedgerService],
  exports: [BillingService, WalletService, LedgerService],
})
export class BillingModule {}
