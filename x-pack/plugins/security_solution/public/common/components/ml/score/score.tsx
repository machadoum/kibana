/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../cell_actions';
import type { Anomaly } from '../types';
import { Spacer } from '../../page';
import { getScoreString } from './score_health';

export const ScoreComponent = ({
  index = 0,
  score,
}: {
  index?: number;
  score: Anomaly;
}): JSX.Element => {
  const scoreString = getScoreString(score.severity);

  return (
    <SecurityCellActions
      mode={CellActionsMode.HOVER_DOWN}
      value={score.entityValue}
      field={{
        name: score.entityName,
        type: KBN_FIELD_TYPES.STRING,
        esTypes: [ES_FIELD_TYPES.KEYWORD],
        aggregatable: true,
        searchable: true,
      }}
      triggerId={SecurityCellActionsTrigger.DEFAULT}
      visibleCellActions={5}
    >
      <>
        {index !== 0 && (
          <>
            {','}
            <Spacer />
          </>
        )}
        {scoreString}
      </>
    </SecurityCellActions>
  );
};

ScoreComponent.displayName = 'ScoreComponent';

export const Score = React.memo(ScoreComponent);

Score.displayName = 'Score';
