/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const addMemoryCounterAttachmentSchema = z.object({
  key: z.string().min(1).describe('Unique key for the counter (e.g. "clicks", "step")'),
  description: z.string().optional().describe('Optional description for the attachment'),
});

/**
 * Dedicated tool to add a memory_counter attachment to the conversation (by-reference).
 * Does not change the generic attachment_add tool; used for testing the memory counter attachment type.
 * Does NOT persist to the store: the initial value is resolved from the store (read-only). The store
 * is only written when the user clicks Save in the UI (persist API) or when update_memory_counter is used.
 */
export const createCounterTool = ({
  attachmentManager,
  attachmentsService,
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof addMemoryCounterAttachmentSchema> => ({
  id: platformCoreTools.addMemoryCounterAttachment,
  type: ToolType.builtin,
  description: `Add a memory counter attachment to the conversation. The counter is stored in memory under the given key. To change the value (creates a new version) use attachment_update with the attachment_id and data: { value }. To update only the store (simulate stale) use ${platformCoreTools.updateMemoryCounter}. When displaying in chat, use <render_attachment id="..." version="N"/> where N is the attachment version to show (after attachment_update, use the new current version).`,
  schema: addMemoryCounterAttachmentSchema,
  tags: ['attachment'],
  handler: async ({ key, description }, context) => {
    const definition = attachmentsService?.getTypeDefinition(AttachmentType.memoryCounter);
    if (!definition) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: `Memory counter attachment type is not registered. Valid types: ${
                attachmentsService?.getRegisteredTypeIds()?.join(', ') ?? 'none'
              }`,
            },
          },
        ],
      };
    }

    const resolveContext = {
      request: context.request,
      spaceId: context.spaceId,
      savedObjectsClient: context.savedObjectsClient,
    };

    let attachment;
    try {
      attachment = await attachmentManager.add(
        {
          type: AttachmentType.memoryCounter,
          origin: key,
          ...(description !== undefined ? { description } : {}),
        },
        ATTACHMENT_REF_ACTOR.agent,
        resolveContext
      );
    } catch (e) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: (e as Error).message },
          },
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            attachment_id: attachment.id,
            attachment_version: attachment.current_version,
            key,
            message: `Added memory counter "${key}" (attachment_id: ${attachment.id}, version ${attachment.current_version}). Use ${platformCoreTools.updateMemoryCounter} with key "${key}" to change its value. To display the counter in the chat, include in your reply: <render_attachment id="${attachment.id}" version="${attachment.current_version}"/>. After attachment_update, use the new version number in the tag.`,
          },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;
    return [
      {
        ...result,
        data: {
          summary: `Added memory counter "${data.key}" (render with <render_attachment id="${data.attachment_id}" version="${data.attachment_version}"/>)`,
          attachment_id: data.attachment_id,
          attachment_version: data.attachment_version,
          key: data.key,
        },
      },
    ];
  },
});
