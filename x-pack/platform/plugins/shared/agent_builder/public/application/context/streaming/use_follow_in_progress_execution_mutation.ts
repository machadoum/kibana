/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback, useRef } from 'react';
import type { Conversation, ConversationRoundStep } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { queryKeys } from '../../query_keys';
import { subscribeToChatEvents } from './use_subscribe_to_chat_events';
import { createConversationActions } from '../conversation/use_conversation_actions';
import {
  clearActiveExecutionId,
  persistActiveExecutionId,
  readActiveExecutionId,
} from '../../utils/active_execution_storage';
import { ensureInProgressRoundForReconnect } from '../../utils/ensure_in_progress_round_for_reconnect';

export interface FollowInProgressExecutionVars {
  conversationId: string;
}

export interface FollowInProgressExecutionMutationBindings {
  setActiveStream: (conversationId: string, value: { type: 'follow'; executionId: string }) => void;
  clearActiveStream: (conversationId: string) => void;
  setError: (conversationId: string, error: unknown, errorSteps: ConversationRoundStep[]) => void;
}

type UseFollowInProgressExecutionMutationProps = FollowInProgressExecutionMutationBindings;

const resolveExecutionId = async ({
  conversationId,
  findRunningExecutionForConversation,
}: {
  conversationId: string;
  findRunningExecutionForConversation: (conversationId: string) => Promise<string | null>;
}): Promise<string | undefined> => {
  const storedExecutionId = readActiveExecutionId(conversationId);
  if (storedExecutionId) {
    return storedExecutionId;
  }

  const runningExecutionId = await findRunningExecutionForConversation(conversationId);
  return runningExecutionId ?? undefined;
};

/**
 * Reconnects to an in-flight execution after embeddable reopen or page refresh.
 */
export const useFollowInProgressExecutionMutation = ({
  setActiveStream,
  clearActiveStream,
  setError,
}: UseFollowInProgressExecutionMutationProps) => {
  const { chatService, conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());

  const { mutateAsync } = useMutation({
    mutationKey: mutationKeys.followInProgressExecution,
    mutationFn: async (vars: FollowInProgressExecutionVars) => {
      const { conversationId } = vars;
      const queryKey = queryKeys.conversations.byId(conversationId);

      if (inFlightRef.current.has(conversationId)) {
        return;
      }

      const storedExecutionId = readActiveExecutionId(conversationId);
      if (storedExecutionId) {
        setActiveStream(conversationId, { type: 'follow', executionId: storedExecutionId });
      }

      const executionId = await resolveExecutionId({
        conversationId,
        findRunningExecutionForConversation:
          chatService.findRunningExecutionForConversation.bind(chatService),
      });

      if (!executionId) {
        if (storedExecutionId) {
          clearActiveStream(conversationId);
        }
        return;
      }

      inFlightRef.current.add(conversationId);
      persistActiveExecutionId(conversationId, executionId);
      setActiveStream(conversationId, { type: 'follow', executionId });

      const previousController = controllersRef.current.get(conversationId);
      previousController?.abort();

      const controller = new AbortController();
      controllersRef.current.set(conversationId, controller);

      const streamActions = createConversationActions({
        conversationId,
        queryClient,
        conversationsService,
      });

      let conversation = queryClient.getQueryData<Conversation>(queryKey);
      if (!conversation) {
        conversation = await conversationsService.get({ conversationId });
        queryClient.setQueryData(queryKey, conversation);
      }

      const lastRound = conversation?.rounds?.at(-1);
      if (lastRound?.status === ConversationRoundStatus.awaitingPrompt) {
        streamActions.clearPendingPrompts();
      }

      await ensureInProgressRoundForReconnect({ conversation, conversationActions: streamActions });

      let succeeded = false;
      try {
        const events$ = chatService.followExecution(
          executionId,
          controller.signal,
          conversationId
        );

        await subscribeToChatEvents({
          events$,
          conversationActions: streamActions,
          isAborted: () => controller.signal.aborted,
        });
        succeeded = true;
      } catch (err) {
        if (!controller.signal.aborted) {
          const cachedConversation = queryClient.getQueryData<Conversation>(queryKey);
          const inProgressSteps = cachedConversation?.rounds?.at(-1)?.steps ?? [];
          setError(conversationId, err, inProgressSteps);
        }
        throw err;
      } finally {
        inFlightRef.current.delete(conversationId);
        clearActiveExecutionId(conversationId);
        clearActiveStream(conversationId);
        if (controllersRef.current.get(conversationId) === controller) {
          controllersRef.current.delete(conversationId);
        }
        if (succeeded) {
          streamActions.invalidateConversation();
        }
      }
    },
  });

  const cancel = useCallback((conversationId: string) => {
    controllersRef.current.get(conversationId)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    for (const controller of controllersRef.current.values()) {
      controller.abort();
    }
  }, []);

  return {
    mutateAsync,
    cancel,
    cancelAll,
  };
};
