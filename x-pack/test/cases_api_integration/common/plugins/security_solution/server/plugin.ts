/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
}

export interface FixtureStartDeps {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, deps: FixtureSetupDeps) {
    const { features } = deps;
    this.registerFeatures(features);
  }

  public start() {}

  public stop() {}

  private registerFeatures(features: FeaturesPluginSetup) {
    features.registerKibanaFeature({
      id: 'securitySolutionFixture',
      name: 'SecuritySolutionFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      cases: ['securitySolutionFixture'],
      privileges: {
        all: {
          api: [
            'casesSuggestUserProfiles',
            'bulkGetUserProfiles',
            'writeCasesConnector',
            'readCasesConnector',
          ],
          app: ['kibana'],
          cases: {
            create: ['securitySolutionFixture'],
            read: ['securitySolutionFixture'],
            update: ['securitySolutionFixture'],
            push: ['securitySolutionFixture'],
          },
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          ui: [],
        },
        read: {
          api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles', 'readCasesConnector'],
          app: ['kibana'],
          cases: {
            read: ['securitySolutionFixture'],
          },
          savedObject: {
            all: [],
            read: [...filesSavedObjectTypes],
          },
          ui: [],
        },
      },
      subFeatures: [
        {
          name: 'Custom privileges',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  name: 'Delete',
                  id: 'cases_delete',
                  includeIn: 'all',
                  cases: {
                    delete: ['securitySolutionFixture'],
                  },
                  savedObject: {
                    all: [...filesSavedObjectTypes],
                    read: [...filesSavedObjectTypes],
                  },
                  ui: [],
                },
              ],
            },
          ],
        },
      ],
    });

    features.registerKibanaFeature({
      id: 'testDisabledFixtureID',
      name: 'TestDisabledFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      // testDisabledFixture is disabled in space1
      cases: ['testDisabledFixture'],
      privileges: {
        all: {
          app: ['kibana'],
          cases: {
            all: ['testDisabledFixture'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          app: ['kibana'],
          cases: {
            read: ['testDisabledFixture'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    features.registerKibanaFeature({
      id: 'testNoCasesConnectorFixture',
      name: 'TestNoCasesConnectorFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      cases: ['testNoCasesConnectorFixture'],
      privileges: {
        all: {
          api: [],
          app: ['kibana'],
          cases: {
            create: ['testNoCasesConnectorFixture'],
            read: ['testNoCasesConnectorFixture'],
            update: ['testNoCasesConnectorFixture'],
          },
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          ui: [],
        },
        read: {
          app: ['kibana'],
          cases: {
            read: [],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });
  }
}
