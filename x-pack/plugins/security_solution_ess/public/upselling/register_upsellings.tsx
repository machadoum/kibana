/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense, LicenseType } from '@kbn/licensing-plugin/public';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { withSuspenseUpsell } from '@kbn/security-solution-upselling/helpers';
import {
  ALERT_SUPPRESSION_RULE_DETAILS,
  ALERT_SUPPRESSION_RULE_FORM,
  UPGRADE_ALERT_ASSIGNMENTS,
  UPGRADE_INVESTIGATION_GUIDE,
} from '@kbn/security-solution-upselling/messages';
import type {
  MessageUpsellings,
  PageUpsellings,
  SectionUpsellings,
  UpsellingMessageId,
  UpsellingSectionId,
  UpsellingService,
} from '@kbn/security-solution-upselling/service';
import React, { lazy } from 'react';

import type { Services } from '../common/services';
import { withServicesProvider } from '../common/services';

const EntityAnalyticsUpsellingLazy = lazy(
  () => import('@kbn/security-solution-upselling/pages/entity_analytics')
);

export const EntityAnalyticsUpsellingSectionLazy = withSuspenseUpsell(
  lazy(() =>
    import('@kbn/security-solution-upselling/sections/entity_analytics').then(
      ({ EntityAnalyticsUpsellingSection }) => ({
        default: EntityAnalyticsUpsellingSection,
      })
    )
  )
);

interface UpsellingsConfig {
  minimumLicenseRequired: LicenseType;
  component: React.ComponentType;
}

interface UpsellingsMessageConfig {
  minimumLicenseRequired: LicenseType;
  message: string;
  id: UpsellingMessageId;
}

type UpsellingPages = Array<UpsellingsConfig & { pageName: SecurityPageName }>;
type UpsellingSections = Array<UpsellingsConfig & { id: UpsellingSectionId }>;
type UpsellingMessages = UpsellingsMessageConfig[];

export const registerUpsellings = (
  upselling: UpsellingService,
  license: ILicense,
  services: Services
) => {
  const upsellingPagesToRegister = upsellingPages(services).reduce<PageUpsellings>(
    (pageUpsellings, { pageName, minimumLicenseRequired, component }) => {
      if (!license.hasAtLeast(minimumLicenseRequired)) {
        pageUpsellings[pageName] = withServicesProvider(component, services);
      }
      return pageUpsellings;
    },
    {}
  );

  const upsellingSectionsToRegister = upsellingSections(services).reduce<SectionUpsellings>(
    (sectionUpsellings, { id, minimumLicenseRequired, component }) => {
      if (!license.hasAtLeast(minimumLicenseRequired)) {
        sectionUpsellings[id] = withServicesProvider(component, services);
      }
      return sectionUpsellings;
    },
    {}
  );

  const upsellingMessagesToRegister = upsellingMessages.reduce<MessageUpsellings>(
    (messagesUpsellings, { id, minimumLicenseRequired, message }) => {
      if (!license.hasAtLeast(minimumLicenseRequired)) {
        messagesUpsellings[id] = message;
      }
      return messagesUpsellings;
    },
    {}
  );

  upselling.setPages(upsellingPagesToRegister);
  upselling.setSections(upsellingSectionsToRegister);
  upselling.setMessages(upsellingMessagesToRegister);
};

// Upsellings for entire pages, linked to a SecurityPageName
export const upsellingPages: (services: Services) => UpsellingPages = (services) => [
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
  {
    pageName: SecurityPageName.entityAnalytics,
    minimumLicenseRequired: 'platinum',
    component: () => (
      <EntityAnalyticsUpsellingLazy
        requiredLicense="Platinum"
        subscriptionUrl={services.application.getUrlForApp('management', {
          path: 'stack/license_management',
        })}
      />
    ),
  },
];

// Upsellings for sections, linked by arbitrary ids
export const upsellingSections: (services: Services) => UpsellingSections = (services) => [
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
  {
    id: 'entity_analytics_panel',
    minimumLicenseRequired: 'platinum',
    component: () => (
      <EntityAnalyticsUpsellingSectionLazy
        requiredLicense="Platinum"
        subscriptionUrl={services.application.getUrlForApp('management', {
          path: 'stack/license_management',
        })}
      />
    ),
  },
];

// Upsellings for sections, linked by arbitrary ids
export const upsellingMessages: UpsellingMessages = [
  {
    id: 'investigation_guide',
    minimumLicenseRequired: 'platinum',
    message: UPGRADE_INVESTIGATION_GUIDE('Platinum'),
  },
  {
    id: 'alert_assignments',
    minimumLicenseRequired: 'platinum',
    message: UPGRADE_ALERT_ASSIGNMENTS('Platinum'),
  },
  {
    id: 'alert_suppression_rule_form',
    minimumLicenseRequired: 'platinum',
    message: ALERT_SUPPRESSION_RULE_FORM('Platinum'),
  },
  {
    id: 'alert_suppression_rule_details',
    minimumLicenseRequired: 'platinum',
    message: ALERT_SUPPRESSION_RULE_DETAILS,
  },
];
