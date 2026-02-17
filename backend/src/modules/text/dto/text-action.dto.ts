import { IsString, IsOptional, IsIn } from 'class-validator';

export class TextActionDto {
  @IsString()
  action!: 'continue' | 'shorten' | 'changeTone' | 'rewrite' | 'improve';

  @IsString()
  text!: string;

  @IsOptional()
  @IsIn(['professional', 'casual', 'creative', 'academic'])
  tone?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
