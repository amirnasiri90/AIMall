import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterService } from './openrouter.service';
import { AiProviderConfigService } from '../ai-providers/ai-provider-config.service';

export interface ProviderStatus {
  providerId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  avgLatencyMs: number;
  errorCount: number;
  successCount: number;
  isEnabled: boolean;
  lastCheckAt: Date;
}

@Injectable()
export class HealthCheckService implements OnModuleInit {
  private readonly logger = new Logger(HealthCheckService.name);
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private healthCache = new Map<string, ProviderStatus>();

  constructor(
    private prisma: PrismaService,
    private openRouter: OpenRouterService,
    private aiProviderConfig: AiProviderConfigService,
  ) {}

  async onModuleInit() {
    // Load existing health data
    await this.loadHealthData();
    // Start periodic health checks
    this.startPeriodicChecks();
  }

  private async loadHealthData() {
    try {
      const records = await this.prisma.providerHealth.findMany();
      for (const r of records) {
        this.healthCache.set(r.providerId, {
          providerId: r.providerId,
          name: r.name,
          status: r.status as any,
          avgLatencyMs: r.avgLatencyMs,
          errorCount: r.errorCount,
          successCount: r.successCount,
          isEnabled: r.isEnabled,
          lastCheckAt: r.lastCheckAt,
        });
      }
    } catch (e) {
      this.logger.warn(`Failed to load health data: ${e}`);
    }
  }

  private startPeriodicChecks() {
    // Check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkAllProviders().catch((e) =>
        this.logger.error(`Health check cycle failed: ${e}`),
      );
    }, 5 * 60 * 1000);

    // Initial check after 10 seconds
    setTimeout(() => {
      this.checkAllProviders().catch((e) =>
        this.logger.error(`Initial health check failed: ${e}`),
      );
    }, 10_000);
  }

  /**
   * Check health of all providers (from AiProviderConfig with API key + enabled).
   */
  async checkAllProviders(): Promise<ProviderStatus[]> {
    const results: ProviderStatus[] = [];
    const configs = await this.aiProviderConfig.getConfigsWithKeys();

    for (const config of configs) {
      try {
        const testResult = await this.aiProviderConfig.testConnection(config.id);
        const status: 'healthy' | 'degraded' | 'unhealthy' = testResult.ok
          ? (testResult.latencyMs && testResult.latencyMs > 5000 ? 'degraded' : 'healthy')
          : 'unhealthy';
        const existing = this.healthCache.get(config.providerKey);
        const newErrorCount = testResult.ok ? existing?.errorCount || 0 : (existing?.errorCount || 0) + 1;
        const newSuccessCount = testResult.ok ? (existing?.successCount || 0) + 1 : existing?.successCount || 0;
        const totalChecks = newErrorCount + newSuccessCount;
        const avgLatency = totalChecks > 0 && testResult.latencyMs != null
          ? Math.round(((existing?.avgLatencyMs || 0) * (totalChecks - 1) + testResult.latencyMs) / totalChecks)
          : (existing?.avgLatencyMs ?? testResult.latencyMs ?? 0);

        const healthStatus: ProviderStatus = {
          providerId: config.providerKey,
          name: config.displayName,
          status,
          avgLatencyMs: avgLatency,
          errorCount: newErrorCount,
          successCount: newSuccessCount,
          isEnabled: true,
          lastCheckAt: new Date(),
        };
        this.healthCache.set(config.providerKey, healthStatus);
        results.push(healthStatus);

        await this.prisma.providerHealth.upsert({
          where: { providerId: config.providerKey },
          create: {
            providerId: config.providerKey,
            name: healthStatus.name,
            status: healthStatus.status,
            avgLatencyMs: healthStatus.avgLatencyMs,
            errorCount: healthStatus.errorCount,
            successCount: healthStatus.successCount,
            isEnabled: true,
            lastCheckAt: healthStatus.lastCheckAt,
          },
          update: {
            status: healthStatus.status,
            avgLatencyMs: healthStatus.avgLatencyMs,
            errorCount: healthStatus.errorCount,
            successCount: healthStatus.successCount,
            lastCheckAt: healthStatus.lastCheckAt,
          },
        });
      } catch (e) {
        this.logger.warn(`Health check for ${config.providerKey} failed: ${e}`);
      }
    }

    if (configs.length === 0) {
      const orHealth = await this.checkOpenRouter();
      results.push(orHealth);
    }
    return results;
  }

  /**
   * Check OpenRouter health with a simple test request.
   */
  private async checkOpenRouter(): Promise<ProviderStatus> {
    const providerId = 'openrouter';
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    let latency = 0;

    try {
      const result = await this.openRouter.generateText(
        'Say "ok" in one word.',
        'openai/gpt-4o-mini',
        { maxTokens: 5 },
      );

      latency = Date.now() - startTime;

      if (result.text) {
        status = latency < 5000 ? 'healthy' : 'degraded';
      }
    } catch (e) {
      latency = Date.now() - startTime;
      status = 'unhealthy';
      this.logger.warn(`OpenRouter health check failed: ${e}`);
    }

    const existing = this.healthCache.get(providerId);
    const newErrorCount = status === 'unhealthy'
      ? (existing?.errorCount || 0) + 1
      : existing?.errorCount || 0;
    const newSuccessCount = status !== 'unhealthy'
      ? (existing?.successCount || 0) + 1
      : existing?.successCount || 0;

    // Calculate rolling average latency
    const totalChecks = newErrorCount + newSuccessCount;
    const avgLatency = totalChecks > 0
      ? Math.round(((existing?.avgLatencyMs || 0) * (totalChecks - 1) + latency) / totalChecks)
      : latency;

    const healthStatus: ProviderStatus = {
      providerId,
      name: 'OpenRouter',
      status,
      avgLatencyMs: avgLatency,
      errorCount: newErrorCount,
      successCount: newSuccessCount,
      isEnabled: existing?.isEnabled ?? true,
      lastCheckAt: new Date(),
    };

    this.healthCache.set(providerId, healthStatus);

    // Persist to DB
    try {
      await this.prisma.providerHealth.upsert({
        where: { providerId },
        create: {
          providerId,
          name: healthStatus.name,
          status: healthStatus.status,
          avgLatencyMs: healthStatus.avgLatencyMs,
          errorCount: healthStatus.errorCount,
          successCount: healthStatus.successCount,
          isEnabled: healthStatus.isEnabled,
          lastCheckAt: healthStatus.lastCheckAt,
        },
        update: {
          status: healthStatus.status,
          avgLatencyMs: healthStatus.avgLatencyMs,
          errorCount: healthStatus.errorCount,
          successCount: healthStatus.successCount,
          lastCheckAt: healthStatus.lastCheckAt,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to persist health data: ${e}`);
    }

    return healthStatus;
  }

  /**
   * Get current health status of all providers.
   */
  getHealthStatus(): ProviderStatus[] {
    return Array.from(this.healthCache.values());
  }

  /**
   * Get health of a specific provider.
   */
  getProviderHealth(providerId: string): ProviderStatus | undefined {
    return this.healthCache.get(providerId);
  }

  /**
   * Check if a provider is available for use.
   */
  isProviderAvailable(providerId: string): boolean {
    const health = this.healthCache.get(providerId);
    if (!health) return true; // Assume available if no data
    return health.isEnabled && health.status !== 'unhealthy';
  }

  /**
   * Enable/disable a provider.
   */
  async setProviderEnabled(providerId: string, enabled: boolean) {
    const health = this.healthCache.get(providerId);
    if (health) {
      health.isEnabled = enabled;
      this.healthCache.set(providerId, health);
    }

    await this.prisma.providerHealth.upsert({
      where: { providerId },
      create: { providerId, name: providerId, isEnabled: enabled },
      update: { isEnabled: enabled },
    });

    return { providerId, isEnabled: enabled };
  }

  /**
   * Reset error counters for a provider.
   */
  async resetProviderHealth(providerId: string) {
    const health = this.healthCache.get(providerId);
    if (health) {
      health.errorCount = 0;
      health.successCount = 0;
      health.status = 'healthy';
      this.healthCache.set(providerId, health);
    }

    await this.prisma.providerHealth.update({
      where: { providerId },
      data: { errorCount: 0, successCount: 0, status: 'healthy' },
    });
  }

  /**
   * Record a provider call result (for real-time tracking).
   */
  recordCallResult(providerId: string, success: boolean, latencyMs: number) {
    let health = this.healthCache.get(providerId);
    if (!health) {
      health = {
        providerId,
        name: providerId,
        status: 'healthy',
        avgLatencyMs: latencyMs,
        errorCount: success ? 0 : 1,
        successCount: success ? 1 : 0,
        isEnabled: true,
        lastCheckAt: new Date(),
      };
      this.healthCache.set(providerId, health);
    }

    if (success) {
      health.successCount++;
    } else {
      health.errorCount++;
    }

    const totalCalls = health.successCount + health.errorCount;
    health.avgLatencyMs = Math.round(
      ((health.avgLatencyMs * (totalCalls - 1)) + latencyMs) / totalCalls,
    );

    // Update status based on recent error rate
    const errorRate = health.errorCount / totalCalls;
    if (errorRate > 0.5) health.status = 'unhealthy';
    else if (errorRate > 0.2) health.status = 'degraded';
    else health.status = 'healthy';

    this.healthCache.set(providerId, health);
  }
}
