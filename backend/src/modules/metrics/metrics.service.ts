import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private requestCount = 0;
  private requestLatencyMs: number[] = [];
  private errorCount = 0;
  private readonly maxSamples = 1000;

  recordRequest(latencyMs: number, isError = false) {
    this.requestCount++;
    if (isError) this.errorCount++;
    this.requestLatencyMs.push(latencyMs);
    if (this.requestLatencyMs.length > this.maxSamples) {
      this.requestLatencyMs.shift();
    }
  }

  getSnapshot() {
    const sorted = [...this.requestLatencyMs].sort((a, b) => a - b);
    const len = sorted.length;
    const p50 = len ? sorted[Math.floor(len * 0.5)] : 0;
    const p95 = len ? sorted[Math.floor(len * 0.95)] : 0;
    const p99 = len ? sorted[Math.floor(len * 0.99)] : 0;
    const avg = len ? sorted.reduce((a, b) => a + b, 0) / len : 0;

    return {
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        success: this.requestCount - this.errorCount,
      },
      latency: {
        avgMs: Math.round(avg * 100) / 100,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        sampleSize: len,
      },
      uptimeSeconds: process.uptime(),
    };
  }

  getPrometheusStyle(): string {
    const s = this.getSnapshot();
    const lines = [
      '# HELP aimall_http_requests_total Total HTTP requests',
      '# TYPE aimall_http_requests_total counter',
      `aimall_http_requests_total ${s.requests.total}`,
      '# HELP aimall_http_requests_errors_total Total HTTP errors',
      '# TYPE aimall_http_requests_errors_total counter',
      `aimall_http_requests_errors_total ${s.requests.errors}`,
      '# HELP aimall_http_latency_avg_ms Average request latency ms',
      '# TYPE aimall_http_latency_avg_ms gauge',
      `aimall_http_latency_avg_ms ${s.latency.avgMs}`,
      '# HELP aimall_uptime_seconds Process uptime',
      '# TYPE aimall_uptime_seconds gauge',
      `aimall_uptime_seconds ${s.uptimeSeconds}`,
    ];
    return lines.join('\n');
  }
}
