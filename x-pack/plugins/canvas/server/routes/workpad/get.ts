/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '../';
import { API_ROUTE_WORKPAD } from '../../../common/lib/constants';
import { catchErrorHandler } from '../catch_error_handler';

export function initializeGetWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.get(
    {
      path: `${API_ROUTE_WORKPAD}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const workpad = await context.canvas.workpad.get(request.params.id);

      if (
        // not sure if we need to be this defensive
        workpad.type === 'canvas-workpad' &&
        workpad.attributes &&
        workpad.attributes.pages &&
        workpad.attributes.pages.length
      ) {
        workpad.attributes.pages.forEach((page) => {
          const elements = (page.elements || []).filter(
            ({ id: pageId }) => !pageId.startsWith('group')
          );
          const groups = (page.groups || []).concat(
            (page.elements || []).filter(({ id: pageId }) => pageId.startsWith('group'))
          );
          page.elements = elements;
          page.groups = groups;
        });
      }

      return response.ok({
        body: {
          id: workpad.id,
          ...workpad.attributes,
        },
      });
    })
  );
}
