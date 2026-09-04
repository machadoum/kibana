/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { ConversationActions } from '../context/conversation/use_conversation_actions';

/** Appends an in-progress round when GET only returned persisted (completed) rounds. */
export const ensureInProgressRoundForReconnect = async ({
  conversation,
  conversationActions,
}: {
  conversation: Conversation | undefined;
  conversationActions: ConversationActions;
}): Promise<void> => {
  const lastRound = conversation?.rounds?.at(-1);
  if (lastRound?.status === ConversationRoundStatus.inProgress) {
    return;
  }

  if (!conversation?.agent_id) {
    return;
  }

  await conversationActions.addOptimisticRound({
    userMessage: '',
    agentId: conversation.agent_id,
  });
};
