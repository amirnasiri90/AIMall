import { IsString, IsNumber, IsOptional, IsBoolean, IsIn, Min } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreatePackageDto {
  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsNumber()
  @Min(1)
  coins!: number;

  @Expose()
  @IsNumber()
  @Min(0)
  priceIRR!: number;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @IsIn(['PERSONAL', 'ORGANIZATION'])
  packageType?: string;

  @Expose()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @Expose()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
