/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  useEuiTheme,
  EuiAccordion,
  EuiTitle,
  EuiSpacer,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { ONE_WEEK_IN_HOURS } from '../../../timelines/components/side_panel/new_user_detail/constants';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { RiskScoreEntity } from '../../../../common/risk_engine';
import type { RiskScoreState } from '../../../explore/containers/risk_score';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getRiskScoreMetricAttributes } from '../../../common/components/visualization_actions/lens_attributes/common/risk_scores/risk_score_metric';
import { useExpandDetailsFlyout } from '../hooks/use_expand_details_flyout';
import { USER_DETAILS_RISK_SCORE_QUERY_ID } from '../user_details';
import { ExpandablePanel } from '../../shared/components/expandable_panel';

export interface RiskSummaryProps {
  riskScoreData: RiskScoreState<RiskScoreEntity.user>;
}

interface TableItem {
  category: string;
  count: number;
}
const LENS_VISUALIZATION_SIZE = 110;
const LAST_30_DAYS = { from: 'now-30d', to: 'now' };

export const RiskSummary = React.memo(({ riskScoreData }: RiskSummaryProps) => {
  const { data: userRisk } = riskScoreData;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
  const { euiTheme } = useEuiTheme();
  const { openPanel } = useExpandDetailsFlyout({
    riskInputs: userRiskData?.user.risk.inputs ?? [],
  });

  const lensAttributes = useMemo(() => {
    return getRiskScoreMetricAttributes({
      severity: userRiskData?.user?.risk?.calculated_level,
      query: `user.name: ${userRiskData?.user?.name}`,
      spaceId: 'default',
      riskEntity: RiskScoreEntity.user,
    });
  }, [userRiskData]);

  const columns: Array<EuiBasicTableColumn<TableItem>> = useMemo(
    () => [
      {
        field: 'category',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.categoryColumnLabel"
            defaultMessage="Category"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
      },
      {
        field: 'count',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.inputsColumnLabel"
            defaultMessage="Inputs"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        dataType: 'number',
      },
    ],
    []
  );

  const xsFontSize = useEuiFontSize('xxs').fontSize;

  const items: TableItem[] = useMemo(
    () => [
      {
        category: 'Alerts',
        count: userRiskData?.user.risk.inputs?.length ?? 0,
      },
    ],
    [userRiskData?.user.risk.inputs?.length]
  );

  return (
    <EuiAccordion
      initialIsOpen
      id={'risk_summary'}
      buttonProps={{
        css: css`
          color: ${euiTheme.colors.primary};
        `,
      }}
      buttonContent={
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.title"
              defaultMessage="Risk summary"
            />
          </h3>
        </EuiTitle>
      }
      extraAction={
        <span
          css={css`
            font-size: ${xsFontSize};
          `}
        >
          {userRiskData && (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskUpdatedTime"
              defaultMessage="Updated {time}"
              values={{
                time: (
                  <FormattedRelativePreferenceDate
                    value={userRiskData['@timestamp']}
                    dateFormat="MMM D, YYYY"
                    relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                  />
                ),
              }}
            />
          )}
        </span>
      }
    >
      <EuiSpacer size="m" />

      <ExpandablePanel
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskInputs"
              defaultMessage="Risk inputs"
            />
          ),
          link: {
            callback: openPanel,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.showAllRiskInputs"
                defaultMessage="Show all risk inputs"
              />
            ),
          },
          iconType: 'arrowStart',
        }}
        expand={{
          expandable: false,
        }}
      >
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFlexItem grow={false}>
            <div
              // Improve Visualization loading state by predefining the size
              css={css`
                height: ${LENS_VISUALIZATION_SIZE}px;
              `}
            >
              {userRiskData && (
                <VisualizationEmbeddable
                  applyGlobalQueriesAndFilters={false}
                  lensAttributes={lensAttributes}
                  id={`RiskSummary-risk_score_metric`}
                  timerange={LAST_30_DAYS}
                  width={'100%'}
                  height={LENS_VISUALIZATION_SIZE}
                  inspectTitle={
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.inspectVisualizationTitle"
                      defaultMessage="Risk Summary Visualization"
                    />
                  }
                />
              )}
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <InspectButtonContainer>
              <div
                // Anchors the position absolute inspect button (nearest positioned ancestor)
                css={css`
                  position: relative;
                `}
              >
                <div
                  // Position the inspect button above the table
                  css={css`
                    position: absolute;
                    right: 0;
                    top: -${euiThemeVars.euiSize};
                  `}
                >
                  <InspectButton
                    queryId={USER_DETAILS_RISK_SCORE_QUERY_ID}
                    title={
                      <FormattedMessage
                        id="xpack.securitySolution.flyout.entityDetails.inspectTableTitle"
                        defaultMessage="Risk Summary Table"
                      />
                    }
                  />
                </div>
                <EuiBasicTable
                  responsive={false}
                  columns={columns}
                  items={items}
                  loading={!userRiskData}
                  compressed
                />
              </div>
            </InspectButtonContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ExpandablePanel>
      <EuiSpacer size="s" />
    </EuiAccordion>
  );
});
RiskSummary.displayName = 'RiskSummary';
