/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { memoryCounterStore } from '../attachment_types/memory_counter_store';

const updateMemoryCounterSchema = z.object({
  key: z.string().min(1).describe('Unique key identifying the counter (e.g. "clicks", "step")'),
  value: z
    .number()
    .int()
    .optional()
    .describe('Set the counter to this value. If omitted, delta is used.'),
  delta: z
    .number()
    .int()
    .optional()
    .describe('Add this to the current value (default 1). Ignored if value is provided.'),
});

export const updateMemoryCounterTool = (): BuiltinToolDefinition<
  typeof updateMemoryCounterSchema
> => {
  return {
    id: platformCoreTools.updateMemoryCounter,
    type: ToolType.builtin,
    description: `Update only the in-memory store for a memory counter by key. Does NOT create a new attachment version—use this to simulate stale state (store and attachment out of sync). Parameters: key (required), optional value (set) or delta (increment). For normal value changes that create a new version, use attachment_update with the attachment_id and data: { value }.`,
    schema: updateMemoryCounterSchema,
    handler: async ({ key, value, delta }) => {
      if (value !== undefined) {
        memoryCounterStore.set(key, value);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                key,
                value,
                message: `In-memory value for "${key}" set to ${value}. The conversation attachment still shows the previous value until the user resyncs (stale). To display the counter in the chat, include <render_attachment id="<attachment_id_for_this_key>"/> in your reply.`,
              },
            },
          ],
        };
      }
      const next = memoryCounterStore.increment(key, delta ?? 1);
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              key,
              value: next,
              message: `In-memory value for "${key}" is now ${next}. The conversation attachment still shows the previous value until the user resyncs (stale). To display the counter in the chat, include <render_attachment id="<attachment_id_for_this_key>"/> in your reply.`,
            },
          },
        ],
      };
    },
    tags: ['attachment'],
  };
};
