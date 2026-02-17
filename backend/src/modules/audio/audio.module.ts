import { Module, forwardRef } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { UsersModule } from '../users/users.module';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { JobsModule } from '../jobs/jobs.module';
import { MockAudioProvider } from './providers/mock-audio.provider';
import { OpenAITtsProvider } from './providers/openai-tts.provider';
import { ElevenLabsTtsProvider } from './providers/elevenlabs-tts.provider';
import { OpenRouterTtsProvider } from './providers/openrouter-tts.provider';

@Module({
  imports: [UsersModule, AiProvidersModule, ApiKeysModule, forwardRef(() => JobsModule)],
  controllers: [AudioController],
  providers: [
    MockAudioProvider,
    OpenAITtsProvider,
    ElevenLabsTtsProvider,
    OpenRouterTtsProvider,
    {
      provide: 'AUDIO_TTS_PROVIDER',
      useFactory: (mock: MockAudioProvider, openai: OpenAITtsProvider) => {
        if ('isAvailable' in openai && (openai as OpenAITtsProvider).isAvailable()) return openai;
        return mock;
      },
      inject: [MockAudioProvider, OpenAITtsProvider],
    },
    {
      provide: 'AUDIO_STT_PROVIDER',
      useFactory: (mock: MockAudioProvider) => mock,
      inject: [MockAudioProvider],
    },
    AudioService,
  ],
  exports: [AudioService],
})
export class AudioModule {}
