import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import { XaiService } from './xai.service';
import { HealthCheckService } from './health-check.service';
import { ProviderResolverService } from '../ai-providers/provider-resolver.service';
import type { ServiceSection } from '../ai-providers/service-mapping.service';

const CHAT_SECTION: ServiceSection = 'chat';
const TEXT_SECTION: ServiceSection = 'text';

/** Remove trailing parenthesized text from model display name so users don't see provider names like (OpenRouter). */
function sanitizeModelName(name: string): string {
  if (!name || typeof name !== 'string') return name;
  return name.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*（[^）]*）\s*$/, '').trim() || name;
}

/** X.AI deprecated grok-2; use grok-3-mini so saved mappings keep working. */
function xaiModelForRequest(model: string): string {
  const m = (model || '').trim().toLowerCase();
  if (m === 'grok-2') return 'grok-3-mini';
  return model || 'grok-3-mini';
}

@Injectable()
export class ProviderManagerService {
  private readonly logger = new Logger(ProviderManagerService.name);

  constructor(
    private openRouter: OpenRouterService,
    private xai: XaiService,
    private healthCheck: HealthCheckService,
    private resolver: ProviderResolverService,
  ) {}

  async generateTextWithFallback(prompt: string, model?: string, options?: any, section: ServiceSection = CHAT_SECTION) {
    const resolved = await this.resolver.resolve(section, model);
    const effectiveModel = model || resolved?.modelId || 'openai/gpt-4o-mini';
    const startTime = Date.now();

    if (resolved?.providerKey === 'xai' && resolved.apiKey) {
      try {
        const result = await this.xai.generateText(resolved.apiKey, prompt, xaiModelForRequest(effectiveModel), options);
        this.healthCheck.recordCallResult('xai', true, Date.now() - startTime);
        return result;
      } catch (e) {
        this.healthCheck.recordCallResult('xai', false, Date.now() - startTime);
        throw e;
      }
    }

    if (!this.healthCheck.isProviderAvailable('openrouter')) {
      this.logger.warn('OpenRouter is unhealthy, attempting anyway');
    }
    try {
      const result = await this.openRouter.generateText(prompt, effectiveModel, options);
      this.healthCheck.recordCallResult('openrouter', true, Date.now() - startTime);
      return result;
    } catch (e) {
      this.healthCheck.recordCallResult('openrouter', false, Date.now() - startTime);
      throw e;
    }
  }

  async *streamTextWithFallback(prompt: string, model?: string, options?: any, section: ServiceSection = CHAT_SECTION): AsyncGenerator<string> {
    const resolved = await this.resolver.resolve(section, model);
    // ترجیح مدل درخواست‌شده توسط کاربر (چت/متن) بر مدل پیشنهادی resolver تا انتخاب کاربر حفظ شود
    const effectiveModel = model || resolved?.modelId || 'openai/gpt-4o-mini';
    const startTime = Date.now();

    if (resolved?.providerKey === 'xai' && resolved.apiKey) {
      try {
        yield* this.xai.streamText(resolved.apiKey, prompt, xaiModelForRequest(effectiveModel), options);
        this.healthCheck.recordCallResult('xai', true, Date.now() - startTime);
        return;
      } catch (e) {
        this.healthCheck.recordCallResult('xai', false, Date.now() - startTime);
        throw e;
      }
    }

    try {
      yield* this.openRouter.streamText(prompt, effectiveModel, options);
      this.healthCheck.recordCallResult('openrouter', true, Date.now() - startTime);
    } catch (e) {
      this.healthCheck.recordCallResult('openrouter', false, Date.now() - startTime);
      throw e;
    }
  }

  async listModels(service?: string) {
    const section = (service as ServiceSection) || CHAT_SECTION;
    const fromMapping = await this.resolver.listModelsForSection(section);
    const list = fromMapping.length > 0 ? fromMapping : await this.openRouter.listModels(service);
    return list.map((m) => ({ ...m, name: sanitizeModelName(m.name) }));
  }

  getProvidersHealth() {
    return this.healthCheck.getHealthStatus();
  }
}
