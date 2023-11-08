/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useCallback } from 'react';
import type { RiskInputs } from '../../../../common/risk_engine';
import { RiskInputsPanelKey } from '../../risk_inputs';

export const useExpandDetailsFlyout = ({ riskInputs }: { riskInputs: RiskInputs }) => {
  const { closeLeftPanel, openLeftPanel, panels } = useExpandableFlyoutContext();
  const isExpanded: boolean = panels.left != null;

  const openPanel = useCallback(() => {
    openLeftPanel({
      id: RiskInputsPanelKey,
      params: {
        riskInputs,
      },
    });
  }, [openLeftPanel, riskInputs]);

  const togglePanel = useCallback(() => {
    if (isExpanded) {
      closeLeftPanel();
    } else {
      openPanel();
    }
  }, [closeLeftPanel, isExpanded, openPanel]);

  return { isExpanded, togglePanel, closePanel: closeLeftPanel, openPanel };
};
