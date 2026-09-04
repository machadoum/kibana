/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationAccessControl,
  ConversationAccessControlEntryInput,
  ConversationAccessControlMode,
} from '@kbn/agent-builder-common';

/**
 * Public-facing contract for Agent Builder conversation reads and access-control updates.
 */
export interface ConversationsServiceStartContract {
  get(conversationId: string): Promise<Conversation>;
  setAccessControl(
    conversationId: string,
    accessControl: {
      access_mode: ConversationAccessControlMode;
      entries: ConversationAccessControlEntryInput[];
    }
  ): Promise<ConversationAccessControl>;
}
