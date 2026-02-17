import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class TextToSpeechDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4)
  speed?: number;

  @IsOptional()
  @IsString()
  language?: string;
}
