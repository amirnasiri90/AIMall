import { IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

function normalizePhoneInput(value: string): string {
  if (typeof value !== 'string') return value;
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  let s = value.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
  s = s.replace(/\D/g, '');
  if (s.length === 10 && s.startsWith('9')) s = '0' + s;
  if (s.length === 12 && s.startsWith('989')) s = '0' + s.slice(2);
  return s;
}

export class RegisterPhoneDto {
  @IsString()
  @Transform(({ value }) => normalizePhoneInput(value))
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر وارد کنید (مثال: 09123456789)' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'رمز عبور حداقل ۸ کاراکتر باشد' })
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
