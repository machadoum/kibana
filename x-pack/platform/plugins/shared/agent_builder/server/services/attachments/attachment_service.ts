/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAttachmentTypeRegistry,
  type AttachmentTypeRegistry,
} from './attachment_type_registry';
import type {
  AttachmentServiceSetup,
  AttachmentServiceStart,
  MemoryCounterPersistHandler,
} from './types';
import { validateAttachment } from './validate_attachment';

export interface AttachmentService {
  setup: () => AttachmentServiceSetup;
  start: () => AttachmentServiceStart;
}

export const createAttachmentService = (): AttachmentService => {
  return new AttachmentServiceImpl();
};

export class AttachmentServiceImpl implements AttachmentService {
  readonly attachmentTypeRegistry: AttachmentTypeRegistry;
  private memoryCounterPersistHandler?: MemoryCounterPersistHandler;

  constructor() {
    this.attachmentTypeRegistry = createAttachmentTypeRegistry();
  }

  setup(): AttachmentServiceSetup {
    return {
      registerType: (attachmentType) => this.attachmentTypeRegistry.register(attachmentType),
      registerMemoryCounterPersist: (handler: MemoryCounterPersistHandler) => {
        this.memoryCounterPersistHandler = handler;
      },
    };
  }

  start(): AttachmentServiceStart {
    return {
      validate: (attachment) => {
        return validateAttachment({ attachment, registry: this.attachmentTypeRegistry });
      },
      getTypeDefinition: (attachment) => {
        return this.attachmentTypeRegistry.get(attachment);
      },
      getRegisteredTypeIds: () => {
        return this.attachmentTypeRegistry.list().map((def) => def.id);
      },
      getMemoryCounterPersistHandler: () => this.memoryCounterPersistHandler,
    };
  }
}
