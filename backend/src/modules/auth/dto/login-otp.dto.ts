import { IsString, Length, Matches } from 'class-validator';
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

export class LoginOtpDto {
  @IsString()
  @Transform(({ value }) => normalizePhoneInput(value))
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر وارد کنید' })
  phone!: string;

  @IsString()
  @Length(5, 6, { message: 'کد باید ۵ یا ۶ رقم باشد' })
  code!: string;
}
