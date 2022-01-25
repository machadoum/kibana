/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { Direction, RiskScoreBetterSortField } from '../../../common/search_strategy';
import { HostsFields } from '../../../common/search_strategy/security_solution';

export enum HostsType {
  page = 'page',
  details = 'details',
}

export enum HostsTableType {
  authentications = 'authentications',
  hosts = 'allHosts',
  events = 'events',
  uncommonProcesses = 'uncommonProcesses',
  anomalies = 'anomalies',
  alerts = 'externalAlerts',
  risk = 'hostRisk',
  riskScoreBetter = 'riskScoreBetter',
}

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

export interface HostsQuery extends BasicQueryPaginated {
  direction: Direction;
  sortField: HostsFields;
}

export interface RiskScoreBetterQuery extends BasicQueryPaginated {
  sort: RiskScoreBetterSortField;
  filterQuery?: Filter;
}

export interface Queries {
  [HostsTableType.authentications]: BasicQueryPaginated;
  [HostsTableType.hosts]: HostsQuery;
  [HostsTableType.events]: BasicQueryPaginated;
  [HostsTableType.uncommonProcesses]: BasicQueryPaginated;
  [HostsTableType.anomalies]: null | undefined;
  [HostsTableType.alerts]: BasicQueryPaginated;
  [HostsTableType.risk]: null | undefined;
  [HostsTableType.riskScoreBetter]: RiskScoreBetterQuery;
}

export interface GenericHostsModel {
  queries: Queries;
}

export interface HostsModel {
  page: GenericHostsModel;
  details: GenericHostsModel;
}
