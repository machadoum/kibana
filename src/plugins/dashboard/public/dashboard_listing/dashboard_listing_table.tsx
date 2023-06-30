/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import React from 'react';

import {
  type TableListViewKibanaDependencies,
  TableListViewKibanaProvider,
  TableListViewTable,
} from '@kbn/content-management-table-list-view-table';

import { toMountPoint, useExecutionContext } from '@kbn/kibana-react-plugin/public';

import { pluginServices } from '../services/plugin_services';

import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import {
  DashboardListingProps,
  DashboardSavedObjectUserContent,
  TableListViewApplicationService,
} from './types';

export const DashboardListingTable = ({
  disableCreateDashboardButton,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  urlStateEnabled,
}: DashboardListingProps) => {
  const {
    application,
    notifications,
    overlays,
    http,
    savedObjectsTagging,

    coreContext: { executionContext },
  } = pluginServices.getServices();

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'list',
  });

  const {
    unsavedDashboardIds,
    refreshUnsavedDashboards,
    tableListViewTableProps: { title: tableCaption, ...tableListViewTable },
  } = useDashboardListingTable({
    disableCreateDashboardButton,
    goToDashboard,
    getDashboardUrl,
    urlStateEnabled,
    useSessionStorageIntegration,
    initialFilter,
  });

  return (
    <I18nProvider>
      <TableListViewKibanaProvider
        {...{
          core: {
            application: application as TableListViewApplicationService,
            notifications,
            overlays,
            http,
          },
          toMountPoint,
          savedObjectsTagging: savedObjectsTagging.hasApi // TODO: clean up this logic once https://github.com/elastic/kibana/issues/140433 is resolved
            ? ({
                ui: savedObjectsTagging,
              } as TableListViewKibanaDependencies['savedObjectsTagging'])
            : undefined,
          FormattedRelative,
        }}
      >
        <>
          <DashboardUnsavedListing
            goToDashboard={goToDashboard}
            unsavedDashboardIds={unsavedDashboardIds}
            refreshUnsavedDashboards={refreshUnsavedDashboards}
          />
          <TableListViewTable<DashboardSavedObjectUserContent>
            tableCaption={tableCaption}
            {...tableListViewTable}
          />
        </>
      </TableListViewKibanaProvider>
    </I18nProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardListingTable;
