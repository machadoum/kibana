/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import React, { useCallback } from 'react';
import type { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_PREVIEW_BANNER } from './preview/constants';
import { DocumentDetailsPreviewPanelKey } from './shared/constants/panel_keys';

interface AlertPreviewButtonProps {
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  id: string;
  'data-test-subj'?: string;
  scopeId: string;
}

export const AlertPreviewButton: FC<AlertPreviewButtonProps> = ({
  id,
  indexName,
  'data-test-subj': dataTestSubj,
  scopeId,
}) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const openAlertPreview = useCallback(
    () =>
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id,
          indexName,
          scopeId,
          isPreviewMode: true,
          banner: ALERT_PREVIEW_BANNER,
        },
      }),
    [openPreviewPanel, id, indexName, scopeId]
  );

  return (
    <EuiButtonIcon
      iconType="expand"
      data-test-subj={dataTestSubj}
      onClick={openAlertPreview}
      aria-label={i18n.translate('ack.securitySolution.flyout.right.alertPreview.ariaLabel', {
        defaultMessage: 'Preview alert with id {id}',
        values: { id },
      })}
    />
  );
};
