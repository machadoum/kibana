/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Post Entity Search discovery API endpoint
 *   version: 1
 */

import { z } from 'zod';

import { ApiConfig } from '../conversations/common_attributes.gen';

export type SearchEntity = z.infer<typeof SearchEntity>;
export const SearchEntity = z.object({
  type: z.enum(['user', 'host']),
  name: z.string(),
  email: z.string().optional(),
});

export type EntityResolutionSuggestion = z.infer<typeof EntityResolutionSuggestion>;
export const EntityResolutionSuggestion = z.object({
  index: z.string().optional(),
  id: z.string().optional(),
  reason: z.string().optional(),
  confidence: z.unknown(),
  document: z.object({}).optional(),
});

export type EntityResolutionPostRequestBody = z.infer<typeof EntityResolutionPostRequestBody>;
export const EntityResolutionPostRequestBody = z.object({
  entity: SearchEntity.optional(),
  filter: z.object({}).optional(),
  entitiesIndexPattern: z.string(),
  /**
   * LLM API configuration.
   */
  apiConfig: ApiConfig,
  /**
   * used for development
   */
  langSmithProject: z.string().optional(),
  /**
   * used for development
   */
  langSmithApiKey: z.string().optional(),
  model: z.string().optional(),
  size: z.number().min(1).max(100),
});
export type EntityResolutionPostRequestBodyInput = z.input<typeof EntityResolutionPostRequestBody>;

export type EntityResolutionPostResponse = z.infer<typeof EntityResolutionPostResponse>;
export const EntityResolutionPostResponse = z.object({
  entity: SearchEntity.optional(),
  foundSuggestion: z.boolean().optional(),
  suggestions: z.array(EntityResolutionSuggestion).optional(),
});
