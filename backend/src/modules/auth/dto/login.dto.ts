import { IsEmail, IsString, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'ایمیل معتبر وارد کنید' })
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(10, { message: 'شماره موبایل معتبر وارد کنید' })
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'رمز عبور حداقل ۸ کاراکتر باشد' })
  password!: string;
}
