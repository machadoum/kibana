/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityRiskScore } from '../../../common/api/entity_analytics/common';
import type { RiskSeverity } from '../../../common/search_strategy';
import { RiskScoreLevel } from './severity/common';

import { HostDetailsLink, UserDetailsLink } from '../../common/components/links';
import { RiskScoreEntity } from '../../../common/entity_analytics/risk_engine';

type RiskScoreColumn = EuiBasicTableColumn<EntityRiskScore> & {
  field: keyof EntityRiskScore;
};

export const RiskScorePreviewTable = ({
  items,
  type,
}: {
  items: EntityRiskScore[];
  type: RiskScoreEntity;
}) => {
  const columns: RiskScoreColumn[] = [
    {
      field: 'id_value',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.riskScore.previewTable.nameColumnTitle"
          defaultMessage="Name"
        />
      ),
      render: (itemName: string) => {
        return type === RiskScoreEntity.host ? (
          <HostDetailsLink hostName={itemName} />
        ) : (
          <UserDetailsLink userName={itemName} />
        );
      },
    },
    {
      field: 'calculated_level',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.riskScore.previewTable.levelColumnTitle"
          defaultMessage="Level"
        />
      ),

      render: (risk: RiskSeverity | null) => {
        if (risk != null) {
          return <RiskScoreLevel severity={risk} />;
        }

        return '';
      },
    },
    {
      field: 'calculated_score_norm',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.riskScore.previewTable.scoreNormColumnTitle"
          defaultMessage="Score norm"
        />
      ),
      render: (scoreNorm: number | null) => {
        if (scoreNorm != null) {
          return Math.round(scoreNorm * 100) / 100;
        }
        return '';
      },
    },
  ];

  return (
    <EuiInMemoryTable<EntityRiskScore>
      data-test-subj={
        type === RiskScoreEntity.host ? 'host-risk-preview-table' : 'user-risk-preview-table'
      }
      responsiveBreakpoint={false}
      items={items}
      columns={columns}
    />
  );
};
