/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryCounterAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  memoryCounterAttachmentDataSchema,
  memoryCounterOriginDataSchema,
} from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import type {
  AttachmentFormatContext,
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { memoryCounterStore } from './memory_counter_store';

/**
 * Attachment type that stores a single integer counter in memory (no server persistence).
 * Origin is the counter key string; the value is resolved from the in-memory store.
 * - On add/create: resolve() only READS from the store (get); the store is never written.
 * - Use attachment_update with data: { value } to change the counter (creates a new version; does not write store).
 * - The store is only written when: (1) the user clicks Save in the UI (persist API), or (2) update_memory_counter is used.
 */
export const createMemoryCounterAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.memoryCounter,
  MemoryCounterAttachmentData
> => {
  return {
    id: AttachmentType.memoryCounter,

    validate: (input) => {
      const parseResult = memoryCounterAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },

    /** Read-only: returns current store value. Does not persist/write to the store. */
    resolve: async (
      origin: string,
      _context: AttachmentResolveContext
    ): Promise<MemoryCounterAttachmentData> => {
      const parsed = memoryCounterOriginDataSchema.safeParse(origin);
      if (!parsed.success) {
        throw new Error(parsed.error.message);
      }
      const value = memoryCounterStore.get(parsed.data);
      return { value };
    },

    isStale: (attachment, _context: AttachmentResolveContext): boolean => {
      const originKey = attachment.origin;
      const originSnapshottedAt = attachment.origin_snapshot_at;

      if (!originKey || !originSnapshottedAt) {
        return false;
      }
      const storeUpdatedAt = memoryCounterStore.getUpdatedAt(originKey);

      if (!storeUpdatedAt) {
        return false;
      }

      return storeUpdatedAt > originSnapshottedAt;
    },

    format: (attachment, _context: AttachmentFormatContext) => {
      const key = attachment.origin ?? attachment.id;
      return {
        getRepresentation: () => ({
          type: 'text' as const,
          value: `Memory counter "${key}" (attachment_id: ${attachment.id}): value is ${attachment.data.value}. To change the value (new version) use attachment_update with this attachment_id and data: { value: <new_value> }. To update only the store (simulate stale) use ${platformCoreTools.updateMemoryCounter} with key "${key}". Display in the chat with <render_attachment id="${attachment.id}" version="<N>"/> using the version number for the snapshot to show.`,
        }),
      };
    },

    getAgentDescription: () =>
      `A memory counter attachment shows an integer. To change the value (creates a new attachment version) use attachment_update with the attachment_id and data: { value: number }. To update only the in-memory store (for testing stale state) use ${platformCoreTools.updateMemoryCounter} with the counter's key. In replies use <render_attachment id="<attachment_id>" version="<N>"/> so the UI shows that version's value (N = version after add or update).`,

    getTools: () => [platformCoreTools.updateMemoryCounter],
  };
};
