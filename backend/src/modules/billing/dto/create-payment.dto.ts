import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'شناسه بسته (packageId) الزامی است' })
  @MinLength(1, { message: 'شناسه بسته نمی‌تواند خالی باشد' })
  packageId!: string;

  @IsOptional()
  @IsString()
  discountCode?: string;
}
