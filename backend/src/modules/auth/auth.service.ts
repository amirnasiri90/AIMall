import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterPhoneDto } from './dto/register-phone.dto';
import { LoginOtpDto } from './dto/login-otp.dto';

const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private audit: AuditService,
    private sms: SmsService,
  ) {}

  private normalizePhone(phone: string): string | null {
    return this.sms.normalizePhone(phone);
  }

  /** نرمال‌سازی ورودی کاربر (اعداد فارسی + فاصله) به 09xxxxxxxxx */
  private normalizePhoneInput(value: string | undefined): string | null {
    if (value == null || typeof value !== 'string') return null;
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    let s = value.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
    s = s.replace(/\D/g, '');
    if (s.length === 10 && s.startsWith('9')) s = '0' + s;
    if (s.length === 12 && s.startsWith('989')) s = '0' + s.slice(2);
    return s.length === 11 && s.startsWith('09') ? s : null;
  }

  private fakeEmailForPhone(phone: string): string {
    return `p_${phone}@phone.local`;
  }

  private signToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  }

  async register(dto: RegisterDto) {
    if (dto.phone) {
      const normalized = this.normalizePhone(dto.phone);
      if (!normalized) throw new BadRequestException('شماره موبایل معتبر وارد کنید');
      const exists = await this.prisma.user.findUnique({ where: { phone: normalized } });
      if (exists) throw new BadRequestException('این شماره قبلاً ثبت شده است');
      const email = this.fakeEmailForPhone(normalized);
      const hashed = await bcrypt.hash(dto.password, 10);
      const user = await this.prisma.user.create({
        data: { email, phone: normalized, password: hashed, name: dto.name, coins: 200 },
      });
      await this.prisma.transaction.create({
        data: { userId: user.id, type: 'CREDIT', amount: 200, balance: 200, reason: 'اعتبار خوش‌آمدگویی', service: 'topup' },
      });
      const token = this.signToken(user);
      const { password, ...result } = user;
      return { access_token: token, user: result };
    }
    if (!dto.email) throw new BadRequestException('ایمیل یا شماره موبایل الزامی است');
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('این ایمیل قبلاً ثبت شده است');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name, coins: 200 },
    });
    await this.prisma.transaction.create({
      data: { userId: user.id, type: 'CREDIT', amount: 200, balance: 200, reason: 'اعتبار خوش‌آمدگویی', service: 'topup' },
    });
    const token = this.signToken(user);
    const { password, ...result } = user;
    return { access_token: token, user: result };
  }

  async registerWithPhone(dto: RegisterPhoneDto) {
    const normalized = this.normalizePhone(dto.phone);
    if (!normalized) throw new BadRequestException('شماره موبایل معتبر وارد کنید');
    const exists = await this.prisma.user.findUnique({ where: { phone: normalized } });
    if (exists) throw new BadRequestException('این شماره قبلاً ثبت شده است');
    const email = this.fakeEmailForPhone(normalized);
    const hashed = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
    const user = await this.prisma.user.create({
      data: { email, phone: normalized, password: hashed, name: dto.name, coins: 200 },
    });
    await this.prisma.transaction.create({
      data: { userId: user.id, type: 'CREDIT', amount: 200, balance: 200, reason: 'اعتبار خوش‌آمدگویی', service: 'topup' },
    });
    const token = this.signToken(user);
    const { password, ...result } = user;
    return { access_token: token, user: result };
  }

  async login(dto: LoginDto, ip?: string) {
    if (!dto.email && !dto.phone) throw new BadRequestException('ایمیل یا شماره موبایل الزامی است');
    const byPhone = !!dto.phone;
    const normalized = byPhone ? this.normalizePhone(dto.phone!) : null;
    const user = byPhone && normalized
      ? await this.prisma.user.findUnique({ where: { phone: normalized } })
      : await this.prisma.user.findUnique({ where: { email: dto.email! } });
    if (!user) throw new UnauthorizedException('شماره/ایمیل یا رمز عبور اشتباه است');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('شماره/ایمیل یا رمز عبور اشتباه است');
    this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email, phone: user.phone },
      ip,
    }).catch(() => {});
    const token = this.signToken(user);
    const { password, ...result } = user;
    return { access_token: token, user: result };
  }

  async sendOtp(body: { phone?: string }) {
    const normalized = this.normalizePhoneInput(body?.phone) ?? this.normalizePhone(body?.phone ?? '');
    if (!normalized) throw new BadRequestException('شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    await this.prisma.otpCode.create({
      data: { phone: normalized, code, expiresAt },
    });
    let sent: { ok: boolean; error?: string };
    const smsIrApiKey = process.env.SMS_IR_API_KEY;
    const smsIrTemplateId = process.env.SMS_IR_TEMPLATE_ID;
    if (smsIrApiKey && smsIrTemplateId) {
      sent = await this.sms.sendVerifyViaSmsIr(normalized, smsIrTemplateId, [{ name: 'code', value: code }]);
    } else if (process.env.SMS_TEMPLATE_KEY) {
      sent = await this.sms.sendWithTemplate(normalized, [code]);
    } else {
      const text = `کد ورود AI Mall: ${code}\nاین کد ${OTP_EXPIRY_MS / 60000} دقیقه اعتبار دارد.`;
      sent = await this.sms.send(normalized, text);
    }
    if (!sent.ok) {
      if (!smsIrApiKey && !process.env.SMS_API_KEY) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[OTP] SMS not configured. Code for ${normalized}: ${code} (valid 2 min)`);
        }
        return { sent: true, message: 'کد به شماره شما ارسال شد', expiresAt: expiresAt.toISOString(), expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000) };
      }
      await this.prisma.otpCode.deleteMany({ where: { phone: normalized, code } }).catch(() => {});
      throw new BadRequestException(sent.error || 'ارسال پیامک ناموفق بود');
    }
    return { sent: true, message: 'کد به شماره شما ارسال شد', expiresAt: expiresAt.toISOString(), expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000) };
  }

  async loginWithOtp(dto: LoginOtpDto, ip?: string) {
    const normalized = this.normalizePhone(dto.phone);
    if (!normalized) throw new BadRequestException('شماره موبایل معتبر وارد کنید');
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone: normalized, code: dto.code },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException('کد وارد شده اشتباه است');
    if (new Date() > otp.expiresAt) {
      await this.prisma.otpCode.delete({ where: { id: otp.id } }).catch(() => {});
      throw new UnauthorizedException('کد منقضی شده است. درخواست کد جدید دهید.');
    }
    await this.prisma.otpCode.deleteMany({ where: { phone: normalized } });
    let user = await this.prisma.user.findUnique({ where: { phone: normalized } });
    if (!user) {
      const email = this.fakeEmailForPhone(normalized);
      const hashed = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
      user = await this.prisma.user.create({
        data: { email, phone: normalized, password: hashed, coins: 200 },
      });
      await this.prisma.transaction.create({
        data: { userId: user.id, type: 'CREDIT', amount: 200, balance: 200, reason: 'اعتبار خوش‌آمدگویی', service: 'topup' },
      });
    }
    this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { phone: user.phone, method: 'OTP' },
      ip,
    }).catch(() => {});
    const token = this.signToken(user);
    const { password, ...result } = user;
    return { access_token: token, user: result };
  }

  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;
    const { password, ...result } = user;
    return result;
  }

  /** به‌روزرسانی پروفایل کاربر جاری (نام و در صورت تمایل شماره موبایل) */
  async updateProfile(userId: string, body: { name?: string; phone?: string }) {
    const data: { name?: string; phone?: string | null } = {};
    if (body.name != null) data.name = body.name.trim() || undefined;
    if (body.phone != null) {
      const normalized = this.normalizePhoneInput(body.phone);
      if (normalized) {
        const existing = await this.prisma.user.findFirst({ where: { phone: normalized, NOT: { id: userId } } });
        if (existing) throw new BadRequestException('این شماره قبلاً توسط کاربر دیگری ثبت شده است');
        data.phone = normalized;
      } else if (String(body.phone).trim() === '') {
        data.phone = null;
      }
    }
    if (Object.keys(data).length === 0) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return null;
      const { password, ...result } = user;
      return result;
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    const { password, ...result } = user;
    return result;
  }
}
