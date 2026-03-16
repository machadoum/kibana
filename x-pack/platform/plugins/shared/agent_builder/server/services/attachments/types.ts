/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ValidateAttachmentResult } from './validate_attachment';

export type MemoryCounterPersistHandler = (key: string, value: number) => void;

export interface AttachmentServiceSetup {
  registerType(attachmentType: AttachmentTypeDefinition): void;
  /** Register a handler to persist a memory counter value to the store (used by platform). */
  registerMemoryCounterPersist?(handler: MemoryCounterPersistHandler): void;
}

export interface AttachmentServiceStart {
  validate<Type extends string, Data>(
    attachment: AttachmentInput<Type, Data>
  ): Promise<ValidateAttachmentResult<Type, Data>>;
  getTypeDefinition(type: string): AttachmentTypeDefinition | undefined;
  getRegisteredTypeIds(): string[];
  getMemoryCounterPersistHandler(): MemoryCounterPersistHandler | undefined;
}
