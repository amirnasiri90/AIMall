import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class GenerateImageDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  ratio?: string;

  @IsOptional()
  @IsString()
  sizeTier?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  count?: number;

  @IsOptional()
  @IsString()
  styleGuide?: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}
