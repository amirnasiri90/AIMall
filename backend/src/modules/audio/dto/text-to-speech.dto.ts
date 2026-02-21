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

  /** لحن خوانش: formal | friendly | narrative | neutral */
  @IsOptional()
  @IsString()
  style?: string;

  /** ElevenLabs stability 0–1 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  stability?: number;

  /** ElevenLabs similarity_boost 0–1 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityBoost?: number;
}
