import { Controller, Get, Post, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BillingService } from './billing.service';
import { LedgerService } from './ledger.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private ledgerService: LedgerService,
  ) {}

  @UseGuards(ApiKeyAuthGuard)
  @Get('balance')
  getBalance(@CurrentUser() user: any) {
    return this.billingService.getBalance(user.id);
  }

  @UseGuards(ApiKeyAuthGuard)
  @Get('transactions')
  getTransactions(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.billingService.getTransactions(user.id, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      category,
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('packages')
  getPackages() {
    return this.billingService.getPackages();
  }

  @Post('payment/preview')
  previewPayment(@Body('packageId') packageId: string, @Body('discountCode') discountCode?: string) {
    return this.billingService.previewOrder(packageId, discountCode);
  }

  @UseGuards(ApiKeyAuthGuard)
  @Post('payment/create')
  createPayment(@CurrentUser() user: any, @Body() body: CreatePaymentDto) {
    return this.billingService.createPaymentOrder(user.id, body.packageId, body.discountCode);
  }

  @Get('payment/verify')
  async verifyPayment(
    @Query('Authority') authority: string,
    @Query('Status') status: string,
    @Res() res: Response,
  ) {
    const result = await this.billingService.verifyPayment(authority, status);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (result.success) {
      res.redirect(`${frontendUrl}/billing/callback?status=success&coins=${result.coins}&refId=${result.refId || ''}`);
    } else {
      res.redirect(`${frontendUrl}/billing/callback?status=failed&message=${encodeURIComponent(result.message || '')}`);
    }
  }

  @UseGuards(ApiKeyAuthGuard)
  @Get('payment/orders')
  getPaymentOrders(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ledgerService.getPaymentOrders(user.id, Number(page) || 1, Number(limit) || 20);
  }

  @UseGuards(ApiKeyAuthGuard)
  @Get('ledger/summary')
  getLedgerSummary(@CurrentUser() user: any) {
    return this.ledgerService.getLedgerSummary(user.id);
  }

  @UseGuards(ApiKeyAuthGuard)
  @Post('reconcile')
  reconcile(@CurrentUser() user: any) {
    return this.ledgerService.reconcile(user.id);
  }

  @UseGuards(ApiKeyAuthGuard)
  @Post('topup/mock')
  mockTopup(@CurrentUser() user: any, @Body('amount') amount: number) {
    return this.billingService.mockTopup(user.id, amount);
  }
}
