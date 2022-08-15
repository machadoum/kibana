/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const USER_RISK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.userRiskToolTip',
  {
    defaultMessage:
      'User risk classification is determined by User risk score. Users classified as Critical or High are indicated as risky.',
  }
);

export const USER_RISK = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.userRiskClassificationTitle',
  {
    defaultMessage: 'User risk classification',
  }
);

export const USER_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.userRiskScoreTitle',
  {
    defaultMessage: 'User risk score',
  }
);

export const USER_NAME = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.userNameTitle',
  {
    defaultMessage: 'User Name',
  }
);

export const USER_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.title',
  {
    defaultMessage: 'User Risk Scores',
  }
);

export const TOTAL_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.totalLabel',
  {
    defaultMessage: 'Total',
  }
);

export const VIEW_ALL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.viewAllLabel',
  {
    defaultMessage: 'View all',
  }
);

export const ENABLE_USER_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.enableUserRiskScore',
  {
    defaultMessage: 'Enable User Risk Score',
  }
);

export const ENABLE_USER_RISK_SCORE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.enableUserRiskScoreDescription',
  {
    defaultMessage:
      'Once you have enabled this feature you can get quick access to the user risk scores in this section.',
  }
);

export const USER_RISK_TABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.usersTableTitle',
  {
    defaultMessage:
      'The user risk table is not affected by the time range. This table shows the latest recorded risk score for each user.',
  }
);
