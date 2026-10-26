import type { LoggerProvider as LoggerProviderType } from "@opentelemetry/sdk-logs";
import { captureRequestError } from "@sentry/nextjs";
import { getPostHogEnv } from "@/lib/posthog-env";

let loggerProvider: LoggerProviderType | null = null;

async function initializePostHogLogs() {
  if (loggerProvider) {
    return;
  }

  const { host, projectToken } = getPostHogEnv();

  if (!projectToken) {
    return;
  }

  const [
    { BatchLogRecordProcessor, LoggerProvider },
    { OTLPLogExporter },
    { resourceFromAttributes },
    { logs },
  ] = await Promise.all([
    import("@opentelemetry/sdk-logs"),
    import("@opentelemetry/exporter-logs-otlp-http"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/api-logs"),
  ]);

  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": "taylored-instruction",
    }),
  });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${host}/i/v1/logs`,
        headers: {
          Authorization: `Bearer ${projectToken}`,
          "Content-Type": "application/json",
        },
      })
    )
  );
  logs.setGlobalLoggerProvider(loggerProvider);
}

export function getPostHogLogLogger() {
  return loggerProvider?.getLogger("posthog-exporter") ?? null;
}

export async function flushPostHogLogs() {
  await loggerProvider?.forceFlush();
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    await initializePostHogLogs();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = captureRequestError;
