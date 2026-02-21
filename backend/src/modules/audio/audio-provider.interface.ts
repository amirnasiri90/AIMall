export interface TtsResult {
  audioUrl: string;
  duration: number;
  model?: string;
}

export interface SttResult {
  text: string;
  model?: string;
}

export interface TtsOptions {
  speed?: number;
  language?: string;
  /** لحن خوانش: formal | friendly | narrative | neutral */
  style?: string;
  /** ElevenLabs: 0–1 */
  stability?: number;
  /** ElevenLabs: 0–1 */
  similarityBoost?: number;
  /** Override API key (from admin provider config). */
  apiKey?: string;
}

export interface IAudioProvider {
  readonly name: string;
  textToSpeech(text: string, voice?: string, model?: string, options?: TtsOptions): Promise<TtsResult>;
  speechToText?(fileBuffer: Buffer, contentType?: string, filename?: string, model?: string): Promise<SttResult>;
}
