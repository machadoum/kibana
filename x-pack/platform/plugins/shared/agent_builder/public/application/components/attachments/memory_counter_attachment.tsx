/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MemoryCounterAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import { useMemoryCounterPersistContext } from '../../context/memory_counter_persist_context';

const label = i18n.translate('xpack.agentBuilder.attachments.memoryCounter.label', {
  defaultMessage: 'Memory counter',
});

/**
 * UI definition for the memory_counter attachment type.
 * Renders the current counter value in the chat and a Save button to persist the value to the store.
 * Saving an old version persists that value to the store (simulates stale state).
 */
export const createMemoryCounterAttachmentDefinition =
  (): AttachmentUIDefinition<MemoryCounterAttachment> => {
    return {
      getLabel: (attachment) => {
        return attachment.origin ? `${label}: ${attachment.origin}` : label;
      },
      getIcon: () => 'number',
      renderInlineContent: ({ attachment }) => {
        return <MemoryCounterContent attachment={attachment} />;
      },
    };
  };

const MemoryCounterContent: React.FC<{ attachment: MemoryCounterAttachment }> = ({
  attachment,
}) => {
  const { euiTheme } = useEuiTheme();
  const persistContext = useMemoryCounterPersistContext();
  const [saving, setSaving] = useState(false);

  const value = attachment.data?.value ?? 0;

  const onSave = useCallback(async () => {
    if (
      !attachment.origin ||
      !persistContext?.conversationId ||
      !persistContext?.persistMemoryCounter
    ) {
      return;
    }
    setSaving(true);
    try {
      await persistContext.persistMemoryCounter(attachment.id, attachment.origin, value);
    } finally {
      setSaving(false);
    }
  }, [attachment.id, attachment.origin, value, persistContext]);

  const canSave = Boolean(
    attachment.origin && persistContext?.conversationId && persistContext?.persistMemoryCounter
  );

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder={true}
      css={{
        maxWidth: 200,
        backgroundColor: euiTheme.colors.emptyShade,
      }}
    >
      <EuiStat
        title={value}
        description={
          attachment.origin ? (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.agentBuilder.attachments.memoryCounter.keyLabel', {
                defaultMessage: 'Key: {key}',
                values: { key: attachment.origin },
              })}
            </EuiText>
          ) : (
            label
          )
        }
        titleSize="l"
      />
      {canSave && (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs" css={{ marginTop: euiTheme.size.s }}>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill={false}
              isLoading={saving}
              onClick={onSave}
              data-test-subj="memory-counter-save-button"
            >
              {i18n.translate('xpack.agentBuilder.attachments.memoryCounter.saveButton', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
