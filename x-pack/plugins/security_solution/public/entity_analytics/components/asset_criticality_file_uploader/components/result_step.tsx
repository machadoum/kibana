/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { AssetCriticalityCsvUploadResponse } from '../../../../../common/entity_analytics/asset_criticality/types';

export const AssetCriticalityResultStep: React.FC<{
  result?: AssetCriticalityCsvUploadResponse;
  validLinesAsText: string;
  errorMessage?: string;
  onReturn: () => void;
}> = ({ result, validLinesAsText, errorMessage, onReturn }) => {
  const { euiTheme } = useEuiTheme();

  if (result === undefined || errorMessage !== undefined) {
    return (
      <>
        <EuiCallOut
          title={
            <FormattedMessage
              defaultMessage="Asset criticality assignment failed."
              id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.errorMessage"
            />
          }
          color="danger"
          iconType="error"
        >
          {errorMessage && errorMessage}
        </EuiCallOut>
        <ResultStepFooter onReturn={onReturn} />
      </>
    );
  }

  if (result.stats.errors === 0) {
    return (
      <>
        <EuiCallOut
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.successTitle',
            { defaultMessage: 'Great success' }
          )}
          color="success"
          iconType="checkInCircleFilled"
        >
          <FormattedMessage
            defaultMessage="Your asset's criticality has been successfully mapped."
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.successMessage"
          />
        </EuiCallOut>
        <ResultStepFooter onReturn={onReturn} />
      </>
    );
  }

  const annotations = result.errors.reduce<Record<number, string>>((acc, e) => {
    acc[e.index] = e.message;
    return acc;
  }, {});

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            defaultMessage="Some criticalities could not be assigned due to errors."
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.partialError.title"
          />
        }
        color="warning"
        iconType="warning"
      >
        <EuiSpacer size="s" />
        <p>
          <FormattedMessage
            defaultMessage="{assignedCount, plural, one {# asset criticality assignment succeeded.} other {# asset criticalities assignments succeeded.}}"
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.partialError.assignedEntities"
            values={{ assignedCount: result.stats.created + result.stats.updated }}
          />
        </p>
        <p>
          <FormattedMessage
            defaultMessage="{failedCount, plural, one {# asset criticality assignment failed.} other {# asset criticalities assignments failed.}}"
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.partialError.failedEntities"
            values={{ failedCount: result.stats.errors }}
          />
        </p>

        <EuiCodeBlock
          overflowHeight={400}
          language="CSV"
          isVirtualized
          css={css`
            border: 1px solid ${euiTheme.colors.warning};
          `}
          lineNumbers={{
            annotations,
          }}
        >
          {validLinesAsText}
        </EuiCodeBlock>
      </EuiCallOut>
      <ResultStepFooter onReturn={onReturn} />
    </>
  );
};

const ResultStepFooter = ({ onReturn }: { onReturn: () => void }) => (
  <>
    <EuiSpacer size="xl" />
    <EuiHorizontalRule />
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiButtonEmpty onClick={onReturn}>
        <FormattedMessage
          defaultMessage="Upload another file"
          id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.uploadAnotherFile"
        />
      </EuiButtonEmpty>
    </EuiFlexGroup>
  </>
);
