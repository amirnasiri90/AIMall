import { Injectable } from '@nestjs/common';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { UsersService } from '../users/users.service';
import { PolicyService } from '../policy/policy.service';

const COIN_COSTS: Record<string, number> = {
  chat: 2,
  text: 5,
  image: 10,
  audio: 8,
};

@Injectable()
export class OrchestratorService {
  constructor(
    private providerManager: ProviderManagerService,
    private usersService: UsersService,
    private policy: PolicyService,
  ) {}

  async runAI(userId: string, prompt: string, model?: string, service?: string, options?: any) {
    const routing = await this.policy.getRouting(userId, options?.organizationId);
    const effectiveModel = model ?? routing.preferredModel ?? undefined;
    const coinCost = COIN_COSTS[service || 'chat'] || 2;
    const result = await this.providerManager.generateTextWithFallback(prompt, effectiveModel, options);
    await this.usersService.deductCoins(userId, coinCost, `استفاده از ${service || 'AI'}`, service);
    return { ...result, coinCost };
  }

  streamAI(prompt: string, model?: string, messages?: any[]) {
    return this.providerManager.streamTextWithFallback(prompt, model, { messages });
  }
}
