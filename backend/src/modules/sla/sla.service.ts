import { Injectable } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SlaTargets {
  uptimePercentMin: number;
  p95LatencyMsMax: number;
}

export interface SlaStatus {
  status: 'OK' | 'DEGRADED' | 'BREACH' | 'UNKNOWN';
  uptime: { currentPercent: number; targetPercent: number; ok: boolean };
  latency: { p95Ms: number; targetMaxMs: number; ok: boolean };
  message: string;
  evaluatedAt: string;
}

@Injectable()
export class SlaService {
  constructor(
    private metrics: MetricsService,
    private prisma: PrismaService,
  ) {}

  async getTargets(): Promise<SlaTargets> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: { in: ['sla_uptime_target_percent', 'sla_p95_max_ms'] },
      },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return {
      uptimePercentMin: Number(map['sla_uptime_target_percent']) || 99.5,
      p95LatencyMsMax: Number(map['sla_p95_max_ms']) || 2000,
    };
  }

  async updateTargets(updates: { uptimePercentMin?: number; p95LatencyMsMax?: number }): Promise<SlaTargets> {
    if (updates.uptimePercentMin != null) {
      await this.prisma.systemSetting.upsert({
        where: { key: 'sla_uptime_target_percent' },
        create: { key: 'sla_uptime_target_percent', value: String(updates.uptimePercentMin), category: 'sla' },
        update: { value: String(updates.uptimePercentMin) },
      });
    }
    if (updates.p95LatencyMsMax != null) {
      await this.prisma.systemSetting.upsert({
        where: { key: 'sla_p95_max_ms' },
        create: { key: 'sla_p95_max_ms', value: String(updates.p95LatencyMsMax), category: 'sla' },
        update: { value: String(updates.p95LatencyMsMax) },
      });
    }
    return this.getTargets();
  }

  /** گزارش SLA: وضعیت فعلی + اهداف (برای گزارش‌گیری و داشبورد) */
  async getReport(): Promise<{ status: SlaStatus; targets: SlaTargets }> {
    const [status, targets] = await Promise.all([this.getStatus(), this.getTargets()]);
    return { status, targets };
  }

  async getStatus(): Promise<SlaStatus> {
    const targets = await this.getTargets();
    const snapshot = this.metrics.getSnapshot();
    const uptimeSeconds = snapshot.uptimeSeconds ?? 0;
    const totalRequests = snapshot.requests?.total ?? 0;
    const errors = snapshot.requests?.errors ?? 0;
    const success = totalRequests - errors;

    // Uptime: based on success rate of requests (simplified; real SLA might use external health checks)
    const currentUptimePercent =
      totalRequests > 0 ? Math.max(0, (success / totalRequests) * 100) : 100;
    const uptimeOk = currentUptimePercent >= targets.uptimePercentMin;

    // Latency
    const p95Ms = snapshot.latency?.p95Ms ?? 0;
    const latencyOk = p95Ms <= targets.p95LatencyMsMax;

    let status: SlaStatus['status'] = 'OK';
    let message = 'سطح سرویس در حد هدف است.';

    if (!uptimeOk && !latencyOk) {
      status = 'BREACH';
      message = 'هر دو شاخص uptime و تأخیر خارج از هدف هستند.';
    } else if (!uptimeOk || !latencyOk) {
      status = 'DEGRADED';
      message = !uptimeOk
        ? 'نرخ موفقیت درخواست‌ها زیر هدف است.'
        : 'تأخیر (P95) بالاتر از هدف است.';
    }

    return {
      status,
      uptime: {
        currentPercent: Math.round(currentUptimePercent * 100) / 100,
        targetPercent: targets.uptimePercentMin,
        ok: uptimeOk,
      },
      latency: {
        p95Ms: Math.round(p95Ms * 100) / 100,
        targetMaxMs: targets.p95LatencyMsMax,
        ok: latencyOk,
      },
      message,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
