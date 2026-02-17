import { IsString, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';

export class GenerateTextDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsIn(['professional', 'casual', 'creative', 'academic'])
  tone?: string;

  @IsOptional()
  @IsIn(['short', 'medium', 'long'])
  length?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  /** Number of variants to generate (1–3). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  variants?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4000)
  maxTokens?: number;

  @IsOptional()
  @IsIn(['fa', 'en', 'ar'])
  language?: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  styleGuide?: string;
}
