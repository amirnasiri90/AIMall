/** سکه مصرفی هر مدل TTS (هماهنگ با listModels در openrouter) */
export const TTS_MODEL_COSTS: Record<string, number> = {
  'openai/tts-1': 3,
  'openai/tts-1-hd': 5,
  'google/cloud-tts': 2,
  'elevenlabs/multilingual-v2': 5,
  'openai/gpt-4o-audio-preview': 6,
  'openai/gpt-audio-mini': 4,
  'openai/gpt-4o-mini-audio-preview': 4,
  'openai/gpt-4o-mini-tts': 4,
};

/** سکه مصرفی هر مدل STT */
export const STT_MODEL_COSTS: Record<string, number> = {
  'openai/whisper-large-v3': 3,
  'openai/whisper-1': 2,
  'google/speech-to-text': 2,
  'deepgram/nova-2': 2,
};

export function getTtsModelCost(model?: string): number {
  const cost = model ? TTS_MODEL_COSTS[model] : undefined;
  return typeof cost === 'number' ? cost : 3;
}

export function getSttModelCost(model?: string): number {
  const cost = model ? STT_MODEL_COSTS[model] : undefined;
  return typeof cost === 'number' ? cost : 2;
}
