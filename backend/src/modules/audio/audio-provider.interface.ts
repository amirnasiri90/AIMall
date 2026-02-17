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
  /** Override API key (from admin provider config). */
  apiKey?: string;
}

export interface IAudioProvider {
  readonly name: string;
  textToSpeech(text: string, voice?: string, model?: string, options?: TtsOptions): Promise<TtsResult>;
  speechToText?(fileBuffer: Buffer, contentType?: string, filename?: string, model?: string): Promise<SttResult>;
}
