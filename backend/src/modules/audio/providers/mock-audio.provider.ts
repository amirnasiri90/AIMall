import { IAudioProvider, TtsResult, SttResult } from '../audio-provider.interface';

/** حداقل MP3 سایلنت برای پخش در مرورگر (دمو) */
const SILENT_MP3_DATA_URI =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV';

export class MockAudioProvider implements IAudioProvider {
  readonly name = 'mock';

  async textToSpeech(text: string, _voice?: string, model?: string, _options?: { speed?: number; language?: string }): Promise<TtsResult> {
    const selectedModel = model || 'mock-tts';
    const duration = Math.round(text.length * 0.05 * 100) / 100;
    return { audioUrl: SILENT_MP3_DATA_URI, duration, model: selectedModel };
  }

  async speechToText(fileBuffer: Buffer, _contentType?: string, _filename?: string, _model?: string): Promise<SttResult> {
    const text = 'این یک متن نمونه از تبدیل گفتار به متن است. سیستم تشخیص گفتار AI Mall با دقت بالا متن شما را تبدیل می‌کند. این خروجی نسخه دمو است.';
    return { text, model: 'mock-stt' };
  }
}
