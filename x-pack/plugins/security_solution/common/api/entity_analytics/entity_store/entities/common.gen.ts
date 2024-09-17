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
 *   title: Common Entities Schemas
 *   version: 1
 */

import { z } from '@kbn/zod';

export type UserEntity = z.infer<typeof UserEntity>;
export const UserEntity = z.object({
  user: z
    .object({
      full_name: z.array(z.string()).optional(),
      domain: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
      name: z.string(),
      id: z.array(z.string()).optional(),
      email: z.array(z.string()).optional(),
      hash: z.array(z.string()).optional(),
    })
    .optional(),
  entity: z
    .object({
      lastSeenTimestamp: z.string().datetime(),
      schemaVersion: z.string(),
      definitionVersion: z.string(),
      displayName: z.string(),
      identityFields: z.array(z.string()),
      id: z.string(),
      type: z.literal('node'),
      firstSeenTimestamp: z.string().datetime(),
      definitionId: z.string(),
    })
    .optional(),
});

export type HostEntity = z.infer<typeof HostEntity>;
export const HostEntity = z.object({
  host: z
    .object({
      hostname: z.array(z.string()).optional(),
      domain: z.array(z.string()).optional(),
      ip: z.array(z.string()).optional(),
      name: z.string(),
      id: z.array(z.string()).optional(),
      type: z.array(z.string()).optional(),
      mac: z.array(z.string()).optional(),
      architecture: z.array(z.string()).optional(),
    })
    .optional(),
  entity: z
    .object({
      lastSeenTimestamp: z.string().datetime(),
      schemaVersion: z.string(),
      definitionVersion: z.string(),
      displayName: z.string(),
      identityFields: z.array(z.string()),
      id: z.string(),
      type: z.literal('node'),
      firstSeenTimestamp: z.string().datetime(),
      definitionId: z.string(),
    })
    .optional(),
});
