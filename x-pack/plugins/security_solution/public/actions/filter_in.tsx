/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import type { FilterManager } from '@kbn/data-plugin/public';
import { createFilter } from './helpers';

export const FILTER_IN = i18n.translate('xpack.securitySolution.actions.filterIn', {
  defaultMessage: 'Filter In',
});
const ID = 'filter-in';
const ICON = 'plusInCircle';

interface FilterInActionContext {
  field: string;
  value: string;
}

export const createFilterInAction = (filterManager: FilterManager) =>
  createAction<FilterInActionContext>({
    id: ID,
    type: ID,
    getIconType: (): string => ICON,
    getDisplayName: () => FILTER_IN,
    isCompatible: async ({ field, value }: FilterInActionContext) => field != null && value != null,
    execute: async ({ field, value }: FilterInActionContext) => {
      const makeFilter = (currentVal: string | null | undefined) =>
        currentVal?.length === 0 ? createFilter(field, undefined) : createFilter(field, currentVal);

      const filters = Array.isArray(value)
        ? value.map((currentVal: string | null | undefined) => makeFilter(currentVal))
        : makeFilter(value);

      if (filterManager != null) {
        filterManager.addFilters(filters);
      }
    },
  });
