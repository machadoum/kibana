/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CellAction, CellActionExecutionContext } from '@kbn/cell-actions';

import { fieldHasCellActions, isInSecurityApp } from '../../utils';
import type { SecurityAppStore } from '../../../common/store';
import { getScopedActions, isInTableScope, isTimelineScope } from '../../../helpers';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { defaultColumnHeaderType, tableDefaults } from '../../../common/store/data_table/defaults';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { dataTableSelectors } from '../../../common/store/data_table';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { KibanaServices } from '../../../common/lib/kibana';

export const ACTION_ID = 'security_toggleColumn';
const ICON = 'listAdd';

export interface ShowTopNActionContext extends CellActionExecutionContext {
  metadata?: {
    scopeId?: string;
    isObjectArray?: boolean;
  };
}

export const COLUMN_TOGGLE = (field: string) =>
  i18n.translate('xpack.timelines.hoverActions.columnToggleLabel', {
    values: { field },
    defaultMessage: 'Toggle {field} column in table',
  });

export const NESTED_COLUMN = (field: string) =>
  i18n.translate('xpack.timelines.hoverActions.nestedColumnToggleLabel', {
    values: { field },
    defaultMessage:
      'The {field} field is an object, and is broken down into nested fields which can be added as columns',
  });

export const createToggleColumnAction = ({
  store,
  order,
}: {
  store: SecurityAppStore;
  order?: number;
}): CellAction<ShowTopNActionContext> => {
  let currentAppId: string | undefined;

  const { application: applicationService } = KibanaServices.get();

  applicationService.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return {
    id: ACTION_ID,
    type: ACTION_ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: ({ field }) => COLUMN_TOGGLE(field.name),
    getDisplayNameTooltip: ({ field, metadata }) =>
      metadata?.isObjectArray ? NESTED_COLUMN(field.name) : COLUMN_TOGGLE(field.name),
    isCompatible: async ({ field, metadata }) => {
      return (
        isInSecurityApp(currentAppId) &&
        fieldHasCellActions(field.name) &&
        !!metadata?.scopeId &&
        (isTimelineScope(metadata?.scopeId) || isInTableScope(metadata?.scopeId))
      );
    },
    execute: async ({ metadata, field }) => {
      const scopeId = metadata?.scopeId;

      if (!scopeId) return;

      const selector = isTimelineScope(scopeId)
        ? timelineSelectors.getTimelineByIdSelector()
        : dataTableSelectors.getTableByIdSelector();

      const defaults = isTimelineScope(scopeId) ? timelineDefaults : tableDefaults;
      const { columns } = selector(store.getState(), scopeId) ?? defaults;

      const scopedActions = getScopedActions(scopeId);

      if (!scopedActions) {
        return;
      }

      if (columns.some((c) => c.id === field.name)) {
        store.dispatch(
          scopedActions.removeColumn({
            columnId: field.name,
            id: scopeId,
          })
        );
      } else {
        store.dispatch(
          scopedActions.upsertColumn({
            column: {
              columnHeaderType: defaultColumnHeaderType,
              id: field.name,
              initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
            },
            id: scopeId,
            index: 1,
          })
        );
      }
    },
  };
};
