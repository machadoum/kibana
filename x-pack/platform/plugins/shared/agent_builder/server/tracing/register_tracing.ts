/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { core as otelCore, node, tracing } from '@elastic/opentelemetry-node/sdk';
import { SavedObjectsClient } from '@kbn/core/server';
import { LateBindingSpanProcessor, ElasticsearchOtlpExporter } from '@kbn/tracing';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from '@kbn/inference-tracing';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { LRUCache } from 'lru-cache';
import { context, propagation, trace } from '@opentelemetry/api';
import type { Attributes, Context, Link, SpanKind } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type { AgentBuilderConfig } from '../config';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';

const SETTING_CACHE_TTL_MS = 30_000;

/**
 * Returns a synchronous `isEnabled()` function backed by an LRU cache with
 * stale-while-revalidate semantics.
 * We need the cache to prevent calling the async uiSettings read on the hot path.
 *
 * The span processor hot-path requires also required synchronous check, but the underlying uiSettings read is async.
 * The cache with `allowStale: true` ensures `isEnabled()` always returns instantly
 * (stale or fresh) while a background fetch refreshes the value every {@link SETTING_CACHE_TTL_MS} ms.
 */
const createCachedIsEnabled = async (core: CoreStart, logger: Logger): Promise<() => boolean> => {
  const cache = new LRUCache<string, boolean>({
    max: 1,
    ttl: SETTING_CACHE_TTL_MS,
    allowStale: true,
    noDeleteOnStaleGet: true,
    noDeleteOnFetchRejection: true,
    fetchMethod: async () => {
      const internalRepo = core.savedObjects.createInternalRepository();
      const internalClient = new SavedObjectsClient(internalRepo);
      return core.uiSettings
        .asScopedToClient(internalClient)
        .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    },
  });

  // Eagerly populate the cache so the first synchronous isEnabled() call has a value
  await cache.fetch('enabled').catch((error) => {
    logger.error(`Failed to fetch tracing settings: ${error.message}`);
  });

  return () => {
    // Stale-while-revalidate: trigger a background refresh when the entry is past TTL.
    void cache.fetch('enabled').catch((error) => {
      logger.error(`Failed to refresh tracing settings: ${error.message}`);
    });
    return cache.get('enabled') ?? false;
  };
};

const buildExporters = (
  core: CoreStart,
  tracingConfig: AgentBuilderConfig['tracing']
): tracing.SpanExporter[] => {
  return [
    ...(tracingConfig.send_to_self
      ? [new ElasticsearchOtlpExporter(core.elasticsearch.client.asInternalUser)]
      : []),
    ...tracingConfig.exporters.map(
      ({ url, headers }) =>
        new OTLPTraceExporter({
          url,
          ...(headers ? { headers } : {}),
        })
    ),
  ];
};

/**
 * Sampler that drops everything except inference spans (identified by
 * the `kibana.inference.tracing` baggage entry). This keeps the standalone
 * provider from creating HTTP or other unwanted spans.
 */
class InferenceOnlySampler implements tracing.Sampler {
  shouldSample(
    ctx: Context,
    _traceId: string,
    _spanName: string,
    _spanKind: SpanKind,
    _attributes: Attributes,
    _links: Link[]
  ): tracing.SamplingResult {
    const baggage = propagation.getBaggage(ctx);
    const isInference =
      baggage?.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value === BAGGAGE_TRACKING_BEACON_VALUE;

    return {
      decision: isInference ? tracing.SamplingDecision.RECORD : tracing.SamplingDecision.NOT_RECORD,
    };
  }

  toString(): string {
    return 'InferenceOnlySampler';
  }
}

/**
 * When `telemetry.tracing.enabled` is false, the global TracerProvider is the
 * OTel no-op default — `trace.getTracer('inference')` returns a no-op tracer
 * and no spans are created.
 *
 * This function installs a minimal standalone TracerProvider so that inference
 * spans are recorded and exported without enabling full Kibana HTTP tracing.
 * The InferenceOnlySampler ensures only inference-context spans are recorded;
 * everything else (HTTP, ES transport, etc.) is dropped by the sampler.
 *
 * If the global provider was already initialized by `initTracing` (i.e.
 * `telemetry.tracing.enabled: true`), this is a no-op — processors are
 * registered on the existing LateBindingSpanProcessor instead.
 */
const ensureTracingInfrastructure = (
  processors: tracing.SpanProcessor[],
  logger: Logger
): (() => Promise<void>) | undefined => {
  const hasGlobalProvider = LateBindingSpanProcessor.hasInstance();

  if (hasGlobalProvider) {
    logger.debug('Global tracing provider already initialized, using LateBindingSpanProcessor');
    const tearDowns = processors.map((processor) => LateBindingSpanProcessor.register(processor));
    return async () => {
      await Promise.all(tearDowns.map((teardown) => teardown()));
    };
  }

  logger.info(
    'Global tracing not enabled — installing standalone TracerProvider for inference spans'
  );

  const contextManager = new AsyncLocalStorageContextManager();
  context.setGlobalContextManager(contextManager);
  contextManager.enable();

  propagation.setGlobalPropagator(
    new otelCore.CompositePropagator({
      propagators: [new otelCore.W3CTraceContextPropagator(), new otelCore.W3CBaggagePropagator()],
    })
  );

  const provider = new node.NodeTracerProvider({
    sampler: new InferenceOnlySampler(),
    spanProcessors: processors,
  });

  trace.setGlobalTracerProvider(provider);

  return async () => {
    await provider.shutdown();
  };
};

export const registerTracingExporter = async ({
  core,
  tracingConfig,
  logger,
}: {
  core: CoreStart;
  tracingConfig: AgentBuilderConfig['tracing'];
  logger: Logger;
}): Promise<(() => Promise<void>) | undefined> => {
  const exporters = buildExporters(core, tracingConfig);

  if (exporters.length === 0) {
    return undefined;
  }

  const isEnabled = await createCachedIsEnabled(core, logger);

  const processors = exporters.map(
    (exporter) =>
      new AgentBuilderSpanProcessor({
        exporter,
        scheduledDelayMillis: tracingConfig.scheduledDelay,
        isEnabled,
      })
  );

  return ensureTracingInfrastructure(processors, logger);
};
