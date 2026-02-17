/**
 * OpenTelemetry tracing bootstrap. Load this before NestJS (e.g. node -r ./dist/tracing.js dist/main.js).
 * When OTEL_EXPORTER_OTLP_ENDPOINT is set, traces are exported to that endpoint.
 * Set OTEL_SERVICE_NAME=aimall-backend (default) and optionally OTEL_TRACES_SAMPLER=parentbased_traceidratio, OTEL_TRACES_SAMPLER_ARG=1.0
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
const serviceName = process.env.OTEL_SERVICE_NAME || 'aimall-backend';

if (endpoint) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter: new OTLPTraceExporter({
      url: endpoint.endsWith('/v1/traces') ? endpoint : `${endpoint.replace(/\/$/, '')}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: true },
      }),
    ],
  });
  sdk.start();
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[Tracing] OpenTelemetry started, exporting to ${endpoint}`);
  }
}
