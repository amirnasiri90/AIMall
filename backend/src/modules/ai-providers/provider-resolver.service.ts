import { Injectable } from '@nestjs/common';
import { ServiceMappingService, MappingEntry, ServiceSection } from './service-mapping.service';
import { AiProviderConfigService } from './ai-provider-config.service';
import { getModelCost } from '../providers/ai-provider.interface';

export interface ResolvedProvider {
  providerKey: string;
  modelId: string;
  apiKey: string | null;
}

@Injectable()
export class ProviderResolverService {
  constructor(
    private serviceMapping: ServiceMappingService,
    private aiProviderConfig: AiProviderConfigService,
  ) {}

  /** Resolve (section, modelId) to provider + model + apiKey. Uses first mapping entry if modelId not found. */
  async resolve(section: ServiceSection, modelId?: string): Promise<ResolvedProvider | null> {
    const entries = await this.serviceMapping.getModelsForSection(section);
    if (!entries.length) return null;
    const entry = modelId
      ? entries.find((e) => e.modelId === modelId || e.label === modelId) || entries[0]
      : entries[0];
    const apiKey = await this.aiProviderConfig.getApiKeyForProvider(entry.providerKey);
    if (!apiKey) return null;
    return { providerKey: entry.providerKey, modelId: entry.modelId, apiKey };
  }

  /** Strip any trailing parenthesized suffix so users only see the model name (e.g. "Claude 3 Haiku" not "Claude 3 Haiku (OpenRouter)"). */
  private sanitizeModelDisplayName(name: string): string {
    if (!name || typeof name !== 'string') return name;
    // Remove trailing (...), (…), （） full-width, and trim
    let out = name.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*（[^）]*）\s*$/, '').trim();
    return out || name;
  }

  /** List models for a section in API format (id, name, coinCost). Provider key is intentionally not exposed to end users. */
  async listModelsForSection(section: ServiceSection): Promise<{ id: string; name: string; description?: string; coinCost?: number }[]> {
    const entries = await this.serviceMapping.getModelsForSection(section);
    return entries.map((e: MappingEntry) => ({
      id: e.modelId,
      name: this.sanitizeModelDisplayName(e.label || e.modelId),
      coinCost: getModelCost(e.modelId),
    }));
  }
}
