import { IsEmail, IsString, MinLength, IsOptional, ValidateIf, Matches } from 'class-validator';

export class RegisterDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر (مثال: 09123456789)' })
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'رمز عبور حداقل ۸ کاراکتر باشد' })
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
