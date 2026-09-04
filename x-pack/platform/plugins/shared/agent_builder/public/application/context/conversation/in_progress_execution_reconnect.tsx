/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useConversationContext } from './conversation_context';
import { useConversationId } from './use_conversation_id';
import { useStreamingContext } from '../streaming/streaming_context';

/**
 * On mount or explicit reopen, reconnect to a running execution so stale HITL UI
 * is disabled and live events resume after the embeddable sidebar closes.
 */
export const InProgressExecutionReconnect = (): null => {
  const conversationId = useConversationId();
  const { conversationReopenNonce } = useConversationContext();
  const { activeStreams, reconnectInProgressExecution } = useStreamingContext();
  const lastAttemptKeyRef = useRef<string>();

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    if (activeStreams.has(conversationId)) {
      return;
    }

    const attemptKey = `${conversationId}:${conversationReopenNonce ?? 'initial'}`;
    if (lastAttemptKeyRef.current === attemptKey) {
      return;
    }
    lastAttemptKeyRef.current = attemptKey;

    void reconnectInProgressExecution(conversationId);
  }, [conversationId, conversationReopenNonce, activeStreams, reconnectInProgressExecution]);

  return null;
};
