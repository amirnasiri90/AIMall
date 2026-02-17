import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const KEY_PREFIX = 'aimall_';
const KEY_BYTES = 24;
const SCOPES_DEFAULT = 'chat,text,image,audio,agents';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private generateRawKey(): { raw: string; hash: string; prefix: string } {
    const raw = KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString('base64url').slice(0, 32);
    return {
      raw,
      hash: this.hashKey(raw),
      prefix: raw.slice(0, 12),
    };
  }

  async create(userId: string, name: string, scopes?: string) {
    const { raw, hash, prefix } = this.generateRawKey();
    await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: scopes || SCOPES_DEFAULT,
      },
    });
    return { name, key: raw, prefix, message: 'کلید فقط یک بار نمایش داده می‌شود؛ آن را ذخیره کنید.' };
  }

  async findAllByUser(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, createdAt: true },
    });
  }

  async delete(userId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new NotFoundException('کلید یافت نشد');
    await this.prisma.apiKey.delete({ where: { id } });
    return { success: true };
  }

  async validateAndGetUser(apiKey: string): Promise<{ userId: string; scopes: string[] } | null> {
    if (!apiKey || !apiKey.startsWith(KEY_PREFIX)) return null;
    const prefix = apiKey.slice(0, 12);
    const record = await this.prisma.apiKey.findFirst({ where: { keyPrefix: prefix } });
    if (!record) return null;
    const hash = this.hashKey(apiKey);
    if (hash !== record.keyHash) return null;

    await this.prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    const scopes = (record.scopes || SCOPES_DEFAULT).split(',').map((s) => s.trim());
    return { userId: record.userId, scopes };
  }

  async hasScope(userId: string, keyId: string, scope: string): Promise<boolean> {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!key) return false;
    const scopes = (key.scopes || SCOPES_DEFAULT).split(',').map((s) => s.trim());
    return scopes.includes(scope) || scopes.includes('*');
  }
}
