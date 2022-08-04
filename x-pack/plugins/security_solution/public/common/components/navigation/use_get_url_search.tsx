/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { SecurityPageName } from '../../../app/types';

import { useGlobalQueryString } from '../../utils/global_query_string';

import { getSearch } from './helpers';
import type { SearchNavTab } from './types';

export const useGetUrlSearch = (pageName: SecurityPageName, tab?: SearchNavTab) => {
  const globalQueryString = useGlobalQueryString();
  const urlSearch = useMemo(
    () => (tab ? getSearch(pageName, globalQueryString) : ''),
    [tab, globalQueryString, pageName]
  );

  return urlSearch;
};

export const useGetUrlStateQueryString = () => {
  const globalQueryString = useGlobalQueryString();
  const getUrlStateQueryString = useCallback(() => {
    return globalQueryString.length > 0 ? `?${globalQueryString}` : '';
  }, [globalQueryString]);

  return getUrlStateQueryString;
};
