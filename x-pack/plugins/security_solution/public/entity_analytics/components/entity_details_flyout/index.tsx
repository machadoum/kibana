/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { PREFIX } from '../../../flyout/shared/test_ids';
import type { RiskInputsTabProps } from './tabs/risk_inputs/risk_inputs_tab';
import { RiskInputsTab } from './tabs/risk_inputs/risk_inputs_tab';
import { EntityResolutionTab } from './tabs/entity_resolution/entity_resolution_tab';

export const RISK_INPUTS_TAB_TEST_ID = `${PREFIX}RiskInputsTab` as const;

export const getRiskInputTab = ({ entityType, entityName, scopeId }: RiskInputsTabProps) => ({
  id: EntityDetailsLeftPanelTab.RISK_INPUTS,
  'data-test-subj': RISK_INPUTS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.userDetails.riskInputs.tabLabel"
      defaultMessage="Risk contributions"
    />
  ),
  content: <RiskInputsTab entityType={entityType} entityName={entityName} scopeId={scopeId} />,
});

export const getEntityResolutionTab = (username: string) => ({
  id: EntityDetailsLeftPanelTab.OBSERVED_DATA,
  'data-test-subj': 'observed_data_tab',
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.userDetails.observedData.tabLabel"
      defaultMessage="Observed Data"
    />
  ),
  content: <EntityResolutionTab username={username} />,
});
