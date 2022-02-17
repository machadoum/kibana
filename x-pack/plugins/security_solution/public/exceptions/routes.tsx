/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { EXCEPTIONS_PATH, SecurityPageName } from '../../common/constants';
import { ExceptionListsTable } from '../detections/pages/detection_engine/rules/all/exceptions/exceptions_table';

import { NotFoundPage } from '../app/404';
import {
  usePageTitle,
  useSyncQueryStringWithReduxStore,
} from '../common/components/url_state/use_url_state';

const ExceptionsRoutes = () => {
  useSyncQueryStringWithReduxStore();
  usePageTitle(SecurityPageName.exceptions);

  return (
    <TrackApplicationView viewId={SecurityPageName.exceptions}>
      <ExceptionListsTable />
    </TrackApplicationView>
  );
};

const renderExceptionsRoutes = () => {
  return (
    <Switch>
      <Route path={EXCEPTIONS_PATH} exact component={ExceptionsRoutes} />
      <Route component={NotFoundPage} />
    </Switch>
  );
};

export const routes = [
  {
    path: EXCEPTIONS_PATH,
    render: renderExceptionsRoutes,
  },
];
