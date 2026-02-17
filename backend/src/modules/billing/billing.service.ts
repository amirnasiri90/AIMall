import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditService,
  ) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const credits = await this.prisma.transaction.aggregate({
      where: { userId, type: 'CREDIT' },
      _sum: { amount: true },
    });
    const debits = await this.prisma.transaction.aggregate({
      where: { userId, type: 'DEBIT' },
      _sum: { amount: true },
    });

    const calculatedBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);

    return {
      coins: user?.coins || 0,
      calculatedBalance,
      isConsistent: user?.coins === calculatedBalance,
      totalCredits: credits._sum.amount || 0,
      totalDebits: debits._sum.amount || 0,
    };
  }

  async getTransactions(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      type?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const { page = 1, limit = 20, category, type, from, to } = options;
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (category) where.category = category;
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPackages() {
    return this.prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private async resolveDiscount(
    packageId: string,
    discountCodeRaw?: string,
  ): Promise<{
    pkg: { id: string; name: string; coins: number; priceIRR: number; discountPercent: number };
    priceAfterPackageDiscount: number;
    discountCode: { id: string; code: string; type: string; value: number } | null;
    discountAmountFromCode: number;
    finalPriceIRR: number;
    totalDiscountAmount: number;
  }> {
    const pkg = await this.prisma.coinPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('بسته یافت نشد');
    const packageDiscount = Math.min(100, Math.max(0, pkg.discountPercent ?? 0));
    const priceAfterPackageDiscount = Math.round(
      pkg.priceIRR * (1 - packageDiscount / 100),
    );
    let discountCode: { id: string; code: string; type: string; value: number } | null = null;
    let discountAmountFromCode = 0;
    if (discountCodeRaw?.trim()) {
      const code = discountCodeRaw.trim().toUpperCase();
      const dc = await this.prisma.discountCode.findUnique({
        where: { code, isActive: true },
      });
      if (dc) {
        const now = new Date();
        if (dc.validFrom && now < dc.validFrom) throw new BadRequestException('کد تخفیف هنوز فعال نیست');
        if (dc.validTo && now > dc.validTo) throw new BadRequestException('کد تخفیف منقضی شده');
        if (dc.maxUses != null && dc.usedCount >= dc.maxUses) throw new BadRequestException('ظرفیت استفاده از این کد تمام شده');
        if (dc.minOrderIRR != null && priceAfterPackageDiscount < dc.minOrderIRR)
          throw new BadRequestException(`حداقل مبلغ سفارش برای این کد ${dc.minOrderIRR} تومان است`);
        if (dc.type === 'PERCENT') {
          discountAmountFromCode = Math.round((priceAfterPackageDiscount * dc.value) / 100);
        } else {
          discountAmountFromCode = Math.min(dc.value, priceAfterPackageDiscount);
        }
        discountCode = { id: dc.id, code: dc.code, type: dc.type, value: dc.value };
      }
    }
    const finalPriceIRR = Math.max(0, priceAfterPackageDiscount - discountAmountFromCode);
    const totalDiscountAmount = pkg.priceIRR - finalPriceIRR;
    return {
      pkg: {
        id: pkg.id,
        name: pkg.name,
        coins: pkg.coins,
        priceIRR: pkg.priceIRR,
        discountPercent: packageDiscount,
      },
      priceAfterPackageDiscount,
      discountCode,
      discountAmountFromCode,
      finalPriceIRR,
      totalDiscountAmount,
    };
  }

  async previewOrder(packageId: string, discountCode?: string) {
    const r = await this.resolveDiscount(packageId, discountCode);
    const packageDiscountIRR = r.pkg.priceIRR - r.priceAfterPackageDiscount;
    return {
      package: r.pkg,
      basePriceIRR: r.pkg.priceIRR,
      packageDiscountPercent: r.pkg.discountPercent,
      packageDiscountIRR,
      priceAfterPackageDiscount: r.priceAfterPackageDiscount,
      discountCode: r.discountCode,
      discountAmountFromCode: r.discountAmountFromCode,
      discountCodeIRR: r.discountAmountFromCode,
      finalPriceIRR: r.finalPriceIRR,
      totalDiscountAmount: r.totalDiscountAmount,
      coins: r.pkg.coins,
    };
  }

  async createPaymentOrder(userId: string, packageId: string, discountCodeRaw?: string) {
    const r = await this.resolveDiscount(packageId, discountCodeRaw);
    const pkg = await this.prisma.coinPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('بسته یافت نشد');

    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        packageId: pkg.id,
        coins: pkg.coins,
        priceIRR: r.finalPriceIRR,
        discountAmount: r.totalDiscountAmount,
        discountCodeId: r.discountCode?.id ?? null,
        status: 'PENDING',
        gateway: 'zarinpal',
      },
    });

    await this.audit.log({
      userId,
      action: 'PAYMENT_ORDER_CREATE',
      entity: 'PaymentOrder',
      entityId: order.id,
      details: {
        coins: pkg.coins,
        priceIRR: r.finalPriceIRR,
        discountAmount: r.totalDiscountAmount,
        packageId,
        packageName: pkg.name,
        discountCode: r.discountCode?.code,
      },
    });

    // پرداخت رایگان (مبلغ نهایی صفر): واریز سکه بدون درگاه
    if (r.finalPriceIRR === 0) {
      const refId = `FREE-${order.id}`;
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'PAID', refId, gateway: 'free' },
      });
      if (order.discountCodeId) {
        await this.prisma.discountCode.update({
          where: { id: order.discountCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }
      const idempotencyKey = `payment-${order.id}`;
      await this.ledger.credit(
        userId,
        pkg.coins,
        `خرید رایگان ${pkg.coins} سکه`,
        'payment',
        order.id,
        'payment',
        idempotencyKey,
      );
      const pkgWithType = await this.prisma.coinPackage.findUnique({ where: { id: pkg.id } });
      if (pkgWithType?.packageType === 'ORGANIZATION') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { hasOrganizationPlan: true },
        });
      }
      await this.audit.log({
        userId,
        action: 'PAYMENT_VERIFIED',
        entity: 'PaymentOrder',
        entityId: order.id,
        details: { coins: pkg.coins, refId, freeOrder: true },
      });
      return { freeOrder: true, orderId: order.id, coins: pkg.coins, refId };
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchantId) {
      this.logger.warn('ZARINPAL_MERCHANT_ID is not set');
      throw new BadRequestException('درگاه پرداخت تنظیم نشده است. ZARINPAL_MERCHANT_ID را در تنظیمات سرور قرار دهید.');
    }

    const isSandbox = process.env.ZARINPAL_SANDBOX === 'true';
    // آدرس رسمی مستندات زرین‌پال: payment.zarinpal.com (نه api.zarinpal.com)
    const requestUrl = isSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
      : 'https://payment.zarinpal.com/pg/v4/payment/request.json';

    const callbackUrl =
      process.env.ZARINPAL_CALLBACK_URL?.trim() ||
      `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/billing/payment/verify`;
    this.logger.log(`ZarinPal callback_url: ${callbackUrl}`);

    // حداقل مبلغ درگاه ۱۰٬۰۰۰ ریال
    const amountRials = Math.max(10000, Math.round(r.finalPriceIRR));

    try {
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: amountRials,
          callback_url: callbackUrl,
          description: `خرید ${pkg.coins} سکه - AI Mall`,
        }),
      });

      const data = await res.json();
      this.logger.log(`ZarinPal request response: status=${res.status} data=${JSON.stringify(data)}`);

      if (data.data?.authority) {
        await this.prisma.paymentOrder.update({
          where: { id: order.id },
          data: { authority: data.data.authority },
        });

        const paymentUrl = isSandbox
          ? `https://sandbox.zarinpal.com/pg/StartPay/${data.data.authority}`
          : `https://payment.zarinpal.com/pg/StartPay/${data.data.authority}`;

        return { paymentUrl, orderId: order.id };
      }

      const errMsg = data.errors?.message || data.errors?.validations?.toString() || 'خطا در ارتباط با زرین‌پال';
      const errCode = data.errors?.code;
      this.logger.error(`ZarinPal error: code=${errCode} message=${errMsg} full=${JSON.stringify(data)}`);
      throw new Error(errMsg);
    } catch (error: any) {
      this.logger.error(`Zarinpal error: ${error.message}`);
      await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });

      await this.audit.log({
        userId,
        action: 'PAYMENT_ORDER_FAILED',
        entity: 'PaymentOrder',
        entityId: order.id,
        details: { error: error.message },
      });

      throw new BadRequestException(error.message || 'خطا در ایجاد درخواست پرداخت');
    }
  }

  async verifyPayment(authority: string, status: string) {
    const order = await this.prisma.paymentOrder.findFirst({
      where: { authority },
      include: { package: true },
    });
    if (!order) throw new NotFoundException('سفارش یافت نشد');

    if (status !== 'OK') {
      await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });

      await this.audit.log({
        userId: order.userId,
        action: 'PAYMENT_CANCELLED',
        entity: 'PaymentOrder',
        entityId: order.id,
        details: { status },
      });

      return { success: false, message: 'پرداخت لغو شد' };
    }

    // Prevent double-verification
    if (order.status === 'PAID') {
      return { success: true, coins: order.coins, refId: order.refId, message: 'قبلاً تأیید شده' };
    }

    const isSandbox = process.env.ZARINPAL_SANDBOX === 'true';
    const verifyUrl = isSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
      : 'https://payment.zarinpal.com/pg/v4/payment/verify.json';

    const verifyAmount = Math.max(10000, Math.round(order.priceIRR));

    try {
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          merchant_id: process.env.ZARINPAL_MERCHANT_ID,
          authority,
          amount: verifyAmount,
        }),
      });

      const data = await res.json();
      if (data.data?.code === 100 || data.data?.code === 101) {
        const refId = String(data.data.ref_id);

        await this.prisma.paymentOrder.update({
          where: { id: order.id },
          data: { status: 'PAID', refId },
        });
        if (order.discountCodeId) {
          await this.prisma.discountCode.update({
            where: { id: order.discountCodeId },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Use ledger for proper double-entry credit
        const idempotencyKey = `payment-${order.id}`;
        await this.ledger.credit(
          order.userId,
          order.coins,
          `خرید ${order.coins} سکه (رف: ${refId})`,
          'payment',
          order.id,
          'payment',
          idempotencyKey,
        );

        if (order.package?.packageType === 'ORGANIZATION') {
          await this.prisma.user.update({
            where: { id: order.userId },
            data: { hasOrganizationPlan: true },
          });
        }

        await this.audit.log({
          userId: order.userId,
          action: 'PAYMENT_VERIFIED',
          entity: 'PaymentOrder',
          entityId: order.id,
          details: { coins: order.coins, refId, priceIRR: order.priceIRR, verifyCode: data.data.code },
        });

        return { success: true, coins: order.coins, refId };
      }

      await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });

      await this.audit.log({
        userId: order.userId,
        action: 'PAYMENT_VERIFY_FAILED',
        entity: 'PaymentOrder',
        entityId: order.id,
        details: { verifyResponse: data },
      });

      return { success: false, message: 'تایید پرداخت ناموفق بود' };
    } catch (error: any) {
      this.logger.error(`Zarinpal verify error: ${error.message}`);
      return { success: false, message: 'خطا در تایید پرداخت' };
    }
  }

  async mockTopup(userId: string, amount: number) {
    if (amount <= 0 || amount > 10000) throw new BadRequestException('مقدار نامعتبر');
    const user = await this.ledger.credit(userId, amount, 'شارژ آزمایشی', 'topup', undefined, 'topup');
    return { coins: user!.coins, added: amount };
  }
}
