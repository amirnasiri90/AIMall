import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContractService } from '../organizations/org-contract.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private orgContract: OrgContractService,
  ) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async deductCoins(
    userId: string,
    amount: number,
    reason: string,
    service?: string,
    category = 'usage',
    idempotencyKey?: string,
  ) {
    await this.orgContract.ensureContractActiveForUser(userId);

    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
      if (existing) return this.prisma.user.findUnique({ where: { id: userId } });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('کاربر یافت نشد');

    const cap = await this.orgContract.getEffectiveCoinCap(userId);
    const effectiveBalance = cap != null ? Math.min(user.coins, cap) : user.coins;
    if (effectiveBalance < amount) throw new BadRequestException('اعتبار کافی نیست');

    const newBalance = user.coins - amount;
    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { coins: newBalance } }),
      this.prisma.transaction.create({
        data: {
          userId, type: 'DEBIT', amount, balance: newBalance,
          reason, service, category, idempotencyKey,
        },
      }),
    ]);
    return updatedUser;
  }

  async addCoins(
    userId: string,
    amount: number,
    reason: string,
    service?: string,
    referenceId?: string,
    category = 'payment',
    idempotencyKey?: string,
  ) {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
      if (existing) return this.prisma.user.findUnique({ where: { id: userId } });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('کاربر یافت نشد');

    const newBalance = user.coins + amount;
    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { coins: newBalance } }),
      this.prisma.transaction.create({
        data: {
          userId, type: 'CREDIT', amount, balance: newBalance,
          reason, service, referenceId, category, idempotencyKey,
        },
      }),
    ]);
    return updatedUser;
  }
}
