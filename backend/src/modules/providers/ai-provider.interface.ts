export interface AIProvider {
  generateText(prompt: string, model?: string, options?: any): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }>;
  streamText(prompt: string, model?: string, options?: any): AsyncGenerator<string>;
  listModels(service?: string): Promise<{ id: string; name: string; description?: string; coinCost?: number }[]>;
}

export const MODEL_COSTS: Record<string, number> = {
  'openai/gpt-4o-mini': 1,
  'openai/gpt-3.5-turbo': 1,
  'anthropic/claude-3-haiku': 2,
  'google/gemini-pro': 2,
  'meta-llama/llama-3-8b-instruct': 1,
  'anthropic/claude-3.5-sonnet': 5,
  'openai/gpt-4o': 5,
  'grok-2': 2,
  'grok-3': 3,
  'grok-3-mini': 2,
  // TTS
  'openai/tts-1': 3,
  'openai/tts-1-hd': 5,
  'elevenlabs/multilingual-v2': 5,
  'google/cloud-tts': 2,
  'openai/gpt-4o-audio-preview': 6,
  'openai/gpt-audio-mini': 4,
  'openai/gpt-4o-mini-audio-preview': 4,
  // STT
  'openai/whisper-large-v3': 3,
  'openai/whisper-1': 2,
  'google/speech-to-text': 2,
  'deepgram/nova-2': 2,
};

export function getModelCost(model: string): number {
  return MODEL_COSTS[model] ?? 2;
}
