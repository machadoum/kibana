/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent Builder OTel indices (`logs-agent_builder.otel-*`, `traces-agent_builder.otel-*`)
 * are excluded from built-in serverless `viewer`/`editor` roles. Because
 * `security.hasPrivileges` returns `false` for a wildcard when *any* matching
 * index is inaccessible, these carved-out indices cause broader wildcard
 * privilege checks to fail for otherwise-authorized users.
 *
 * Consumers can append the matching exclusion to their privilege check patterns
 * via {@link excludeAgentBuilderOtelIndices} so the assertion ignores those
 * indices that the calling feature never needs to read.
 *
 * See https://github.com/elastic/kibana/issues/272478
 */
export const AGENT_BUILDER_OTEL_INDEX_EXCLUSIONS: Record<string, string> = {
  'logs-*-*': 'logs-agent_builder.otel-*',
  'logs-*.otel-*': 'logs-agent_builder.otel-*',
  'traces-*-*': 'traces-agent_builder.otel-*',
  'traces-*.otel-*': 'traces-agent_builder.otel-*',
};

export const excludeAgentBuilderOtelIndices = (pattern: string): string => {
  const exclusion = AGENT_BUILDER_OTEL_INDEX_EXCLUSIONS[pattern];
  return exclusion ? `${pattern},-${exclusion}` : pattern;
};
