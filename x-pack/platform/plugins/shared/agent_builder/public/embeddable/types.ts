/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { EmbeddableConversationProps } from '@kbn/agent-builder-browser';
import type { AgentBuilderInternalService } from '../services';

export type { EmbeddableConversationProps };

export interface EmbeddableConversationDependencies {
  services: AgentBuilderInternalService;
  coreStart: CoreStart;
}

export interface EmbeddableConversationCallbacks {
  updateProps: (props: EmbeddableConversationProps) => void;
  resetBrowserApiTools: () => void;
  addAttachment: (attachment: ConversationAttachment) => void;
  removeAttachmentById: (attachmentId: string) => void;
}

export interface EmbeddableConversationSidebarProps {
  onClose?: () => void;
  ariaLabelledBy: string;
  /**
   * Conversation to restore on open. When set, stale React Query cache for this id is
   * cleared before fetching from the server.
   * @internal Passed via `openChat({ conversationId })`.
   */
  conversationId?: string;
  /**
   * Bumps on each `openChat({ conversationId })` call so the embeddable re-fetches even
   * when reopening the same conversation id.
   * @internal
   */
  conversationReopenNonce?: number;
  /**
   * Callback to register sidebar control methods.
   * Used internally to update sidebar props and clear browser API tools.
   * @internal
   */
  onRegisterCallbacks?: (callbacks: EmbeddableConversationCallbacks) => void;
  /**
   * When true, uses the singleton `QueryClient`/`StreamingProvider` (mounted once outside
   * the sidebar's lifecycle) instead of creating fresh ones on mount, so in-flight streams
   * and cached conversation data survive the sidebar's close/reopen cycle.
   * @internal Set only by `sidebar_conversation.tsx`.
   */
  persistAcrossReopen?: boolean;
}

export type EmbeddableConversationInternalProps = EmbeddableConversationDependencies &
  EmbeddableConversationProps &
  EmbeddableConversationSidebarProps;
